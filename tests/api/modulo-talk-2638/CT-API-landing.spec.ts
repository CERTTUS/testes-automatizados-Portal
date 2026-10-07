import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {C_TOKEN_OK, C_TOKEN_REVOGADO} from '../../e2e/helpers/portalFixtures';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

test.describe('API — landing portal (TALK-2666)', () => {
   test('CT-API-01 — Landing com tokens derivados', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_OK)}`;
      const oRes = await request.get(cUrl);
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-API-01', oRes.status(), cUrl, cTexto);
      expect(oRes.status(), cTexto).toBe(200);
      const oBody = JSON.parse(cTexto) as {
         lSucesso?: boolean;
         oDados?: {
            cNomeFantasia?: string;
            oTokensDerivados?: Record<string, string>;
         };
      };
      expect(oBody.lSucesso).toBe(true);
      expect(oBody.oDados?.cNomeFantasia).toBe('Oficina E2E');
      expect(oBody.oDados?.oTokensDerivados?.['--cor-primaria']).toBe('#1a5276');
   });

   test('CT-API-02 — Landing link revogado', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_REVOGADO)}`;
      const oRes = await request.get(cUrl);
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-API-02', oRes.status(), cUrl, cTexto);
      expect(oRes.status()).toBe(410);
      const oBody = JSON.parse(cTexto) as {lSucesso?: boolean};
      expect(oBody.lSucesso).toBe(false);
   });
});
