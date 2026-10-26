import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';
import {C_TOKEN_TEMA_CUSTOM} from '../../e2e/helpers/portalFixtures';

test.describe('Smoke — tema cache landing (TALK-2770)', () => {
   test('CT-SMK-01 — JSON landing contém cTemaCacheChave', async ({request}, testInfo) => {
      const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(C_TOKEN_TEMA_CUSTOM)}`;
      const oRes = await request.get(cUrl);
      const cTexto = await oRes.text();
      await evidenciarApiPreCr(testInfo, 'CT-SMK-01', oRes.status(), cUrl, cTexto);
      expect(oRes.status(), cTexto).toBe(200);
      const oBody = JSON.parse(cTexto) as {
         lSucesso?: boolean;
         oDados?: {cTemaCacheChave?: string};
      };
      expect(oBody.lSucesso).toBe(true);
      expect(typeof oBody.oDados?.cTemaCacheChave).toBe('string');
      expect((oBody.oDados?.cTemaCacheChave ?? '').includes(':')).toBe(true);
   });
});
