import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {
   C_TOKEN_OK,
   C_TOKEN_TEMA_CUSTOM,
   telefoneAutorizado,
   tokenPortalOk,
} from '../../e2e/helpers/portalFixtures';
import {
   C_MENSAGEM_ACESSO_NEGADO,
   C_MENSAGEM_DADOS_INVALIDOS,
   cookieSessaoValor,
   respostaApiLer,
   telefoneNaoAutorizado,
   tokenRevogadoLogin,
} from './loginD1Api';

const C_URL_ACESSO = `${E2E_API_BASE_URL}/acesso/telefone`;

test.describe('API — login por telefone do portal (IN-947)', () => {
   test('CT-API-01 — Telefone autorizado recebe sessão do portal', async ({request}, testInfo) => {
      const oRes = await request.post(C_URL_ACESSO, {
         data: {cToken: tokenPortalOk(), cTelefone: telefoneAutorizado()},
      });
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-01', C_URL_ACESSO);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const cOsPublicId = (oCorpo.oDados as {cOsPublicId?: string} | undefined)?.cOsPublicId;
      expect(typeof cOsPublicId).toBe('string');
      expect((cOsPublicId ?? '').length).toBeGreaterThan(0);
      expect(cookieSessaoValor(oRes)).not.toBeNull();
   });

   test('CT-API-02 — Telefone fora da O.S. recebe acesso negado', async ({request}, testInfo) => {
      const oRes = await request.post(C_URL_ACESSO, {
         data: {cToken: tokenPortalOk(), cTelefone: telefoneNaoAutorizado()},
      });
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-02', C_URL_ACESSO);
      expect(nStatus, cTexto).toBe(403);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_ACESSO_NEGADO);
      expect(cookieSessaoValor(oRes)).toBeNull();
   });

   test('CT-API-03 — Pedido de acesso sem telefone é rejeitado', async ({request}, testInfo) => {
      const oRes = await request.post(C_URL_ACESSO, {data: {cToken: C_TOKEN_OK}});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-03', C_URL_ACESSO);
      expect(nStatus, cTexto).toBe(400);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_DADOS_INVALIDOS);
      expect(cookieSessaoValor(oRes)).toBeNull();
   });

   test('CT-API-04 — Telefone sem DDI 55 é rejeitado', async ({request}, testInfo) => {
      const oRes = await request.post(C_URL_ACESSO, {
         data: {cToken: C_TOKEN_OK, cTelefone: '11999999999'},
      });
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-04', C_URL_ACESSO);
      expect(nStatus, cTexto).toBe(400);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_DADOS_INVALIDOS);
      expect(cookieSessaoValor(oRes)).toBeNull();
   });

   test('CT-API-05 — Login com link revogado não abre sessão', async ({request}, testInfo) => {
      const oRes = await request.post(C_URL_ACESSO, {
         data: {cToken: tokenRevogadoLogin(), cTelefone: telefoneAutorizado()},
      });
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-05', C_URL_ACESSO);
      expect(nStatus, cTexto).toBe(410);
      expect(oCorpo.lSucesso).toBe(false);
      expect(cookieSessaoValor(oRes)).toBeNull();
   });

   test('CT-API-06 — Landing de portal com tema escuro informa o modo', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_TEMA_CUSTOM)}`;
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-06', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      expect((oCorpo.oDados as {cTemaModo?: string} | undefined)?.cTemaModo).toBe('escuro');
   });
});
