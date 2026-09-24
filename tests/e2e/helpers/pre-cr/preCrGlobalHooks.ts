import {test} from '@playwright/test';
import {evidenciarSmokePreCr} from './evidenciarSmokePreCr';
import {extrairCtIdDoTitulo} from './extrairCtIdDoTitulo';

test.afterEach(async ({page}, testInfo) => {
   if (process.env.PRE_CR !== '1') {
      return;
   }
   if (testInfo.status !== testInfo.expectedStatus) {
      return;
   }

   const ctId = extrairCtIdDoTitulo(testInfo.title);
   if (!ctId) {
      return;
   }

   if (page) {
      const jaSmoke = testInfo.annotations.some(
         (a) => a.type === 'evidencia-pass' && (a.description || '').toUpperCase().startsWith(`${ctId}:`),
      );
      if (!jaSmoke) {
         await evidenciarSmokePreCr(page, testInfo, ctId, testInfo.title);
      }
   }
});
