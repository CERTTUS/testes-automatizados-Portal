// Módulo modulo-in-949-tema-rodape (IN-949, HU IN-946): tema do portal (modo e cores) que decide
// a versão da logo da Certtus no rodapé e no login pela cor real do fundo.
import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {C_TOKEN_OK, C_TOKEN_TEMA_CUSTOM} from '../../e2e/helpers/portalFixtures';
import {obterCookiePortalSessao} from '../../e2e/helpers/portalAcessoApiHelpers';
import {C_TOKEN_INEXISTENTE, cookieHeaderDe, respostaApiLer} from '../modulo-in-946-login-telefone/loginD1Api';
import {C_TOKEN_TEMA_AVANCADO, C_TOKEN_TEMA_COR_INVALIDA} from './temaRodapeApi';

const cUrlLanding = (cToken: string) => `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cToken)}`;
const cUrlDetalhe = (cId: string) => `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(cId)}`;

type oTemaAvancadoApi = {editor?: string; authRodape?: string; loginFundo?: string};
type oTemaApi = {
   cCorPrimaria?: string;
   cCorSecundaria?: string;
   cTemaModo?: string;
   oTemaAvancado?: oTemaAvancadoApi;
   oTokensDerivados?: unknown;
};

function oOrdemServicoTemaDe(oCorpo: Record<string, unknown>): oTemaApi | undefined {
   return (oCorpo.oDados as {oOrdemServico?: oTemaApi} | undefined)?.oOrdemServico;
}

test.describe('API — IN-949: tema do portal que decide a logo do rodapé', () => {
   test('CT-API-01 — Landing de portal com tema claro entrega o tema do rodapé', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_OK);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-01', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oDados = oCorpo.oDados as
         | {cTemaModo?: string; oTokensDerivados?: Record<string, string>}
         | undefined;
      expect([undefined, 'claro']).toContain(oDados?.cTemaModo);
      const mChaves = Object.keys(oDados?.oTokensDerivados ?? {});
      expect(mChaves.length).toBeGreaterThan(0);
      expect(mChaves.every((cChave) => cChave.startsWith('--'))).toBe(true);
   });

   test('CT-API-02 — Landing com token acima de 64 caracteres é rejeitada sem tema', async ({request}, testInfo) => {
      const cUrl = cUrlLanding('x'.repeat(65));
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-02', cUrl);
      expect(nStatus, cTexto).toBe(400);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe('Token inválido.');
      expect(oCorpo.oDados).toBeUndefined();
   });

   test('CT-API-03 — Landing com token sem link cadastrado não entrega tema', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_INEXISTENTE);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-03', cUrl);
      expect(nStatus, cTexto).toBe(404);
      expect(oCorpo.lSucesso).toBe(false);
      const oDados = oCorpo.oDados as {oTokensDerivados?: unknown; cTemaModo?: unknown} | undefined;
      expect(oDados?.oTokensDerivados).toBeUndefined();
      expect(oDados?.cTemaModo).toBeUndefined();
   });

   test('CT-API-04 — Landing de portal com tema escuro entrega o modo e os tokens', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_TEMA_CUSTOM);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-04', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oDados = oCorpo.oDados as oTemaApi | undefined;
      expect(oDados?.cTemaModo).toBe('escuro');
      const mChaves = Object.keys((oDados?.oTokensDerivados as Record<string, string> | undefined) ?? {});
      expect(mChaves.length).toBeGreaterThan(0);
      expect(mChaves.every((cChave) => cChave.startsWith('--'))).toBe(true);
   });

   test('CT-API-05 — Landing com tema avançado e fundo escuro repassa o tema sem alterar', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_TEMA_AVANCADO);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-05', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oDados = oCorpo.oDados as oTemaApi | undefined;
      expect(oDados?.cCorPrimaria).toBe('#1a5276');
      expect(oDados?.cTemaModo).toBe('claro');
      expect(oDados?.oTemaAvancado).toEqual({editor: 'avancado', authRodape: '#0F3D73', loginFundo: '#0F3D73'});
   });

   test('CT-API-06 — Detalhe da O.S. com tema avançado e fundo escuro repassa o tema e descarta tokens do MS', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_TEMA_AVANCADO);
      const cUrl = cUrlDetalhe(C_TOKEN_TEMA_AVANCADO);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-06', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oOs = oOrdemServicoTemaDe(oCorpo);
      expect(oOs?.cCorPrimaria).toBe('#1a5276');
      expect(oOs?.cCorSecundaria).toBe('#2874a6');
      expect(oOs?.cTemaModo).toBe('claro');
      expect(oOs?.oTemaAvancado).toEqual({editor: 'avancado', authRodape: '#0F3D73', loginFundo: '#0F3D73'});
      expect(oOs?.oTokensDerivados).toBeUndefined();
   });

   test('CT-API-07 — Detalhe da O.S. com cor inválida no avançado é repassado sem quebrar', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_TEMA_COR_INVALIDA);
      const cUrl = cUrlDetalhe(C_TOKEN_TEMA_COR_INVALIDA);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-07', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oOs = oOrdemServicoTemaDe(oCorpo);
      expect(oOs?.cTemaModo).toBe('claro');
      expect(oOs?.oTemaAvancado?.authRodape).toBe('azul');
      expect(oOs?.oTemaAvancado?.loginFundo).toBe('azul');
   });
});
