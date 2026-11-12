// Módulo modulo-talk-3103-cor-texto-elementos (TALK-3103, HU TALK-3100): contrato do tema avançado com
// cor de texto por elemento e fundo/texto próprio por card (landing e detalhe da O.S.).
import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {obterCookiePortalSessao} from '../../e2e/helpers/portalAcessoApiHelpers';
import {cookieHeaderDe, respostaApiLer} from '../modulo-in-946-login-telefone/loginD1Api';
import {
   C_TOKEN_CARDS_SEPARADOS,
   C_TOKEN_TEXTO_AUTOMATICO,
   C_TOKEN_TEXTO_INVALIDO,
   C_TOKEN_TEXTO_LEGADO,
   C_TOKEN_TEXTO_PERSONALIZADO,
   M_CHAVES_CARD,
   M_CHAVES_CARDS_SEPARADOS_GRAVADAS,
   M_CHAVES_TEXTO_ELEMENTO,
   O_TEMA_CARDS_SEPARADOS,
   O_TEMA_TEXTO_AUTOMATICO,
   O_TEMA_TEXTO_INVALIDO,
   O_TEMA_TEXTO_LEGADO,
   O_TEMA_TEXTO_PERSONALIZADO,
} from './corTextoElementosApi';

const cUrlLanding = (cToken: string) => `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cToken)}`;
const cUrlDetalhe = (cId: string) => `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(cId)}`;

type oTemaApi = {
   cTemaModo?: string;
   oTemaAvancado?: Record<string, unknown>;
   oTokensDerivados?: unknown;
};

function oOrdemServicoTemaDe(oCorpo: Record<string, unknown>): oTemaApi | undefined {
   return (oCorpo.oDados as {oOrdemServico?: oTemaApi} | undefined)?.oOrdemServico;
}

function expectSemChaves(oTema: Record<string, unknown> | undefined, mChaves: readonly string[]) {
   for (const cChave of mChaves) {
      expect(Object.prototype.hasOwnProperty.call(oTema ?? {}, cChave), `chave ${cChave} não deveria existir`).toBe(false);
   }
}

function expectChavesNulas(oTema: Record<string, unknown> | undefined, mChaves: readonly string[]) {
   for (const cChave of mChaves) {
      expect(oTema, `chave ${cChave} deveria estar presente`).toHaveProperty(cChave);
      expect(oTema?.[cChave], `chave ${cChave} deveria ser null`).toBeNull();
   }
}

async function landingLer(request: Parameters<Parameters<typeof test>[2]>[0]['request'], testInfo: Parameters<Parameters<typeof test>[2]>[1], cToken: string, cCt: string) {
   const cUrl = cUrlLanding(cToken);
   const oRes = await request.get(cUrl);
   const oResp = await respostaApiLer(oRes, testInfo, cCt, cUrl);
   expect(oResp.nStatus, oResp.cTexto).toBe(200);
   expect(oResp.oCorpo.lSucesso).toBe(true);
   return (oResp.oCorpo.oDados as oTemaApi | undefined) ?? {};
}

async function detalheLer(request: Parameters<Parameters<typeof test>[2]>[0]['request'], testInfo: Parameters<Parameters<typeof test>[2]>[1], cToken: string, cCt: string) {
   const cCookie = await obterCookiePortalSessao(request, cToken);
   const cUrl = cUrlDetalhe(cToken);
   const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
   const oResp = await respostaApiLer(oRes, testInfo, cCt, cUrl);
   expect(oResp.nStatus, oResp.cTexto).toBe(200);
   expect(oResp.oCorpo.lSucesso).toBe(true);
   return oOrdemServicoTemaDe(oResp.oCorpo);
}

test.describe('API — TALK-3103: cor de texto por elemento no tema do portal @api @TALK-3103', () => {
   test('CT-API-01 — Landing entrega as cores de texto de cada elemento como foram salvas (CT-API-01)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_TEXTO_PERSONALIZADO, 'CT-API-01');
      expect(oDados.cTemaModo).toBe('claro');
      expect(oDados.oTemaAvancado).toEqual(O_TEMA_TEXTO_PERSONALIZADO);
      expect(oDados.oTemaAvancado?.loginBotaoTexto).toBe('#FFE8CC');
      expect(oDados.oTemaAvancado?.authCabecalhoTexto).toBe('#FFD166');
      expect(oDados.oTemaAvancado?.authFundoTexto).toBe('#1B4332');
      expect(oDados.oTemaAvancado?.authCardTexto).toBe('#5A189A');
      expect(oDados.oTemaAvancado?.authRodapeTexto).toBe('#D8F3DC');
      expect(oDados.oTemaAvancado?.acaoDestaqueTexto).toBe('#FFF1F2');
      expect(oDados.oTemaAvancado?.loginTexto).toBe('#7A2E00');
   });

   test('CT-API-02 — Landing com textos em automático entrega as chaves com valor nulo (CT-API-02)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_TEXTO_AUTOMATICO, 'CT-API-02');
      expectChavesNulas(oDados.oTemaAvancado, M_CHAVES_TEXTO_ELEMENTO);
      expectChavesNulas(oDados.oTemaAvancado, M_CHAVES_CARD);
      expect(oDados.oTemaAvancado?.loginTexto).toBe('#171717');
      expect(oDados.oTemaAvancado).toEqual(O_TEMA_TEXTO_AUTOMATICO);
   });

   test('CT-API-03 — Landing de tema salvo antes da mudança continua igual (CT-API-03)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_TEXTO_LEGADO, 'CT-API-03');
      expect(oDados.oTemaAvancado).toEqual(O_TEMA_TEXTO_LEGADO);
      expect(oDados.oTemaAvancado?.loginTexto).toBe('#E0E0E0');
      expectSemChaves(oDados.oTemaAvancado, M_CHAVES_TEXTO_ELEMENTO);
      expectSemChaves(oDados.oTemaAvancado, M_CHAVES_CARD);
   });

   test('CT-API-04 — Landing com cor de texto inválida é entregue sem quebrar a página (CT-API-04)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_TEXTO_INVALIDO, 'CT-API-04');
      expect(oDados.oTemaAvancado?.authCardTexto).toBe('roxo');
      expect(oDados.oTemaAvancado?.authRodapeTexto).toBe('#12345');
      expect(oDados.oTemaAvancado?.acaoDestaqueTexto).toBe('rgb(255, 0, 0)');
   });

   test('CT-API-05 — Detalhe da O.S. entrega as cores de texto e descarta tokens do MS (CT-API-05)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_TEXTO_PERSONALIZADO, 'CT-API-05');
      expect(oOs?.cTemaModo).toBe('claro');
      expect(oOs?.oTemaAvancado).toEqual(O_TEMA_TEXTO_PERSONALIZADO);
      expect(oOs?.oTemaAvancado?.authCabecalhoTexto).toBe('#FFD166');
      expect(oOs?.oTemaAvancado?.authFundoTexto).toBe('#1B4332');
      expect(oOs?.oTemaAvancado?.authCardTexto).toBe('#5A189A');
      expect(oOs?.oTemaAvancado?.authRodapeTexto).toBe('#D8F3DC');
      expect(oOs?.oTemaAvancado?.acaoDestaqueTexto).toBe('#FFF1F2');
      expect(oOs?.oTokensDerivados).toBeUndefined();
   });

   test('CT-API-06 — Detalhe da O.S. com textos em automático entrega as chaves com valor nulo (CT-API-06)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_TEXTO_AUTOMATICO, 'CT-API-06');
      expectChavesNulas(oOs?.oTemaAvancado, M_CHAVES_TEXTO_ELEMENTO);
      expectChavesNulas(oOs?.oTemaAvancado, M_CHAVES_CARD);
      expect(oOs?.oTemaAvancado).toEqual(O_TEMA_TEXTO_AUTOMATICO);
   });

   test('CT-API-07 — Detalhe da O.S. de tema salvo antes da mudança continua igual (CT-API-07)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_TEXTO_LEGADO, 'CT-API-07');
      expect(oOs?.cTemaModo).toBe('claro');
      expect(oOs?.oTemaAvancado).toEqual(O_TEMA_TEXTO_LEGADO);
      expectSemChaves(oOs?.oTemaAvancado, M_CHAVES_TEXTO_ELEMENTO);
      expectSemChaves(oOs?.oTemaAvancado, M_CHAVES_CARD);
   });

   test('CT-API-08 — Detalhe da O.S. com cor de texto inválida é entregue sem quebrar (CT-API-08)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_TEXTO_INVALIDO, 'CT-API-08');
      expect(oOs?.oTemaAvancado?.authCardTexto).toBe('roxo');
      expect(oOs?.oTemaAvancado?.authRodapeTexto).toBe('#12345');
      expect(oOs?.oTemaAvancado?.acaoDestaqueTexto).toBe('rgb(255, 0, 0)');
   });

   test('CT-API-12 — Landing entrega fundo e texto próprios do campo do telefone (CT-API-12)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_CARDS_SEPARADOS, 'CT-API-12');
      expect(oDados.oTemaAvancado?.loginCampo).toBe('#FFF1C2');
      expect(oDados.oTemaAvancado?.loginCampoTexto).toBe('#5C3B00');
      expect(oDados.oTemaAvancado?.authCard).toBe('#FFFFFF');
   });

   test('CT-API-13 — Detalhe da O.S. entrega fundo e texto próprios de cada card (CT-API-13)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_CARDS_SEPARADOS, 'CT-API-13');
      for (const cChave of M_CHAVES_CARDS_SEPARADOS_GRAVADAS) {
         expect(oOs?.oTemaAvancado?.[cChave], cChave).toBe(O_TEMA_CARDS_SEPARADOS[cChave]);
      }
      expect(oOs?.oTemaAvancado?.authCard).toBe('#FFFFFF');
      expect(oOs?.oTemaAvancado?.authCardTexto).toBeUndefined();
      expect(oOs?.oTemaAvancado).toEqual(O_TEMA_CARDS_SEPARADOS);
   });

   test('CT-API-14 — Card só com fundo próprio chega sem texto inventado (CT-API-14)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_CARDS_SEPARADOS, 'CT-API-14');
      expect(oDados.oTemaAvancado?.authCardAbas).toBe('#FDECEC');
      expect(oDados.oTemaAvancado?.authCardAbasTexto ?? null).toBeNull();
   });
});
