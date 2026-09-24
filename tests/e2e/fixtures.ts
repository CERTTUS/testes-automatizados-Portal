import {test as base, expect} from '@playwright/test';
import {evidenciarSmokePreCr} from './helpers/pre-cr/evidenciarSmokePreCr';
import {extrairCtIdDoTitulo} from './helpers/pre-cr/extrairCtIdDoTitulo';

const test = base.extend({
   _evidenciaPreCr: [
      async ({page}, use, testInfo) => {
         await use();
         if (process.env.PRE_CR !== '1') {
            return;
         }
         if (testInfo.status !== testInfo.expectedStatus) {
            return;
         }
         const ctId = extrairCtIdDoTitulo(testInfo.title);
         if (!ctId || !page) {
            return;
         }
         const jaSmoke = testInfo.annotations.some(
            (a) => a.type === 'evidencia-pass' && (a.description || '').toUpperCase().startsWith(`${ctId}:`),
         );
         if (jaSmoke) {
            return;
         }
         await evidenciarSmokePreCr(page, testInfo, ctId, testInfo.title);
      },
      {auto: true},
   ],
});

export {test, expect};
