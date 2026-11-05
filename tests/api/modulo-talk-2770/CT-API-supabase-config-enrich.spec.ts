import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';
import {obterCookiePortalSessao} from '../../e2e/helpers/portalAcessoApiHelpers';
import {
   C_TOKEN_ABAS_FILTRADAS,
   C_TOKEN_FAIL_OPEN_CONFIG,
   C_TOKEN_TEMA_CUSTOM,
   mAbasOrdemExtrair,
} from '../../e2e/helpers/portalFixtures';

type LandingDados = {
   cTemaCacheChave?: string;
   cTemaModo?: string;
   oTokensDerivados?: Record<string, string>;
   cNomeFantasia?: string;
};

test.describe('API — enrich Supabase portal_cliente_config (TALK-2770)', () => {
   test('CT-API-04 — Landing tema custom com cTemaCacheChave', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_TEMA_CUSTOM)}`;
      const oRes = await request.get(cUrl);
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-API-04', oRes.status(), cUrl, cTexto);
      expect(oRes.status(), cTexto).toBe(200);
      const oBody = JSON.parse(cTexto) as {lSucesso?: boolean; oDados?: LandingDados};
      expect(oBody.lSucesso).toBe(true);
      expect(typeof oBody.oDados?.cTemaCacheChave).toBe('string');
      expect((oBody.oDados?.cTemaCacheChave ?? '').trim().length).toBeGreaterThan(0);
      expect(oBody.oDados?.cNomeFantasia).toBe('Oficina Tema Custom');
   });

   test('CT-API-05 — Landing fail-open mantém tokens default e cache', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_FAIL_OPEN_CONFIG)}`;
      const oRes = await request.get(cUrl);
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-API-05', oRes.status(), cUrl, cTexto);
      expect(oRes.status(), cTexto).toBe(200);
      const oBody = JSON.parse(cTexto) as {lSucesso?: boolean; oDados?: LandingDados};
      expect(oBody.lSucesso).toBe(true);
      expect(typeof oBody.oDados?.cTemaCacheChave).toBe('string');
      expect((oBody.oDados?.cTemaCacheChave ?? '').trim().length).toBeGreaterThan(0);
      expect(oBody.oDados?.oTokensDerivados?.['--cor-primaria']).toBe('#1a5276');
      expect(oBody.oDados?.cNomeFantasia).toBe('Oficina E2E');
   });

   test('CT-API-06 — Detalhe OS filtra mAbasOrdem por flags_conteudo', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_ABAS_FILTRADAS);
      const cUrl = `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(C_TOKEN_ABAS_FILTRADAS)}`;
      const oRes = await request.get(cUrl, {
         headers: {Cookie: cCookie},
      });
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-API-06', oRes.status(), cUrl, cTexto);
      expect(oRes.status(), cTexto).toBe(200);
      const oBody = JSON.parse(cTexto) as {lSucesso?: boolean; oDados?: Record<string, unknown>};
      expect(oBody.lSucesso).toBe(true);
      const mAbas = mAbasOrdemExtrair(oBody.oDados ?? {});
      expect(mAbas).toEqual(['checklist', 'pecas']);
      expect(mAbas).not.toContain('fotos');
      expect(mAbas).not.toContain('servicos');
   });

});
