// Módulo modulo-talk-3105-logo-formato (TALK-3105, HU TALK-3100): contrato da logo da oficina na landing e no
// detalhe da O.S. (BFF repassa a URL sem reescrever; nenhum campo de formato).
import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {obterCookiePortalSessao} from '../../e2e/helpers/portalAcessoApiHelpers';
import {cookieHeaderDe, respostaApiLer} from '../modulo-in-946-login-telefone/loginD1Api';
import {
   C_LOGO_URL_HORIZONTAL,
   C_NOME_LOGO_HORIZONTAL,
   C_NOME_SEM_LOGO,
   C_TOKEN_LOGO_HORIZONTAL,
   C_TOKEN_SEM_LOGO,
   M_CHAVES_FORMATO_PROIBIDAS,
} from './logoFormatoApi';

const cUrlLanding = (cToken: string) => `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cToken)}`;
const cUrlDetalhe = (cId: string) => `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(cId)}`;

type oLandingLogoApi = {
   cNomeFantasia?: string;
   lTemLogo?: unknown;
   cLogoUrl?: unknown;
   [cChave: string]: unknown;
};
type oBrandingApi = {cLogoUrl?: unknown; cNomeFantasia?: unknown};
type oOrdemServicoLogoApi = {oBranding?: oBrandingApi};

async function landingLer(request: Parameters<Parameters<typeof test>[2]>[0]['request'], testInfo: Parameters<Parameters<typeof test>[2]>[1], cToken: string, cCt: string) {
   const cUrl = cUrlLanding(cToken);
   const oRes = await request.get(cUrl);
   const oResp = await respostaApiLer(oRes, testInfo, cCt, cUrl);
   expect(oResp.nStatus, oResp.cTexto).toBe(200);
   expect(oResp.oCorpo.lSucesso).toBe(true);
   return (oResp.oCorpo.oDados as oLandingLogoApi | undefined) ?? {};
}

async function detalheLer(request: Parameters<Parameters<typeof test>[2]>[0]['request'], testInfo: Parameters<Parameters<typeof test>[2]>[1], cToken: string, cCt: string) {
   const cCookie = await obterCookiePortalSessao(request, cToken);
   const cUrl = cUrlDetalhe(cToken);
   const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
   const oResp = await respostaApiLer(oRes, testInfo, cCt, cUrl);
   expect(oResp.nStatus, oResp.cTexto).toBe(200);
   expect(oResp.oCorpo.lSucesso).toBe(true);
   return (oResp.oCorpo.oDados as {oOrdemServico?: oOrdemServicoLogoApi} | undefined)?.oOrdemServico;
}

test.describe('API — TALK-3105: logo da oficina quadrada ou horizontal no portal @api @TALK-3105', () => {
   test('CT-API-09 — Landing entrega a logo horizontal da oficina como foi enviada (CT-API-09)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_LOGO_HORIZONTAL, 'CT-API-09');
      expect(oDados.lTemLogo).toBe(true);
      expect(oDados.cLogoUrl).toBe(C_LOGO_URL_HORIZONTAL);
      expect(oDados.cNomeFantasia).toBe(C_NOME_LOGO_HORIZONTAL);
      for (const cChave of M_CHAVES_FORMATO_PROIBIDAS) {
         expect(Object.prototype.hasOwnProperty.call(oDados, cChave), `campo ${cChave} não deveria existir`).toBe(false);
      }
      expect(Object.keys(oDados).filter((c) => /formato|proporcao|largura|altura/i.test(c))).toEqual([]);
   });

   test('CT-API-10 — Landing de portal sem logo não inventa imagem (CT-API-10)', async ({request}, testInfo) => {
      const oDados = await landingLer(request, testInfo, C_TOKEN_SEM_LOGO, 'CT-API-10');
      expect(oDados.lTemLogo).toBe(false);
      expect(oDados.cLogoUrl).toBe('');
      expect(oDados.cNomeFantasia).toBe(C_NOME_SEM_LOGO);
   });

   test('CT-API-15 — Detalhe da O.S. entrega a mesma logo da landing (CT-API-15)', async ({request}, testInfo) => {
      // Landing lida só como referência (sem evidência própria): a prova do CT-API-15 é a resposta do detalhe.
      const oResLanding = await request.get(cUrlLanding(C_TOKEN_LOGO_HORIZONTAL));
      expect(oResLanding.status()).toBe(200);
      const oLanding = ((await oResLanding.json()) as {oDados?: oLandingLogoApi}).oDados ?? {};
      expect(oLanding.cLogoUrl).toBe(C_LOGO_URL_HORIZONTAL);
      const oOs = await detalheLer(request, testInfo, C_TOKEN_LOGO_HORIZONTAL, 'CT-API-15');
      expect(oOs?.oBranding?.cLogoUrl).toBe(oLanding.cLogoUrl);
      expect(oOs?.oBranding?.cLogoUrl).toBe(C_LOGO_URL_HORIZONTAL);
      expect(oOs?.oBranding?.cNomeFantasia).toBe(C_NOME_LOGO_HORIZONTAL);
   });

   test('CT-API-16 — Detalhe da O.S. de oficina sem logo entrega URL vazia (CT-API-16)', async ({request}, testInfo) => {
      const oOs = await detalheLer(request, testInfo, C_TOKEN_SEM_LOGO, 'CT-API-16');
      expect(oOs?.oBranding).toBeDefined();
      expect(oOs?.oBranding?.cLogoUrl).toBe('');
      expect(oOs?.oBranding?.cNomeFantasia).toBe(C_NOME_SEM_LOGO);
   });
});
