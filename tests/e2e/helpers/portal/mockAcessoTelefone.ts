import type {Page} from '@playwright/test';

export async function mockarAcessoTelefone403(
   page: Page,
   cMensagem = 'Acesso não autorizado',
): Promise<void> {
   await page.route('**/api/bff/acesso/telefone', async (route) => {
      if (route.request().method() !== 'POST') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 403,
         contentType: 'application/json',
         body: JSON.stringify({
            lSucesso: false,
            cMensagem,
            oDados: {},
         }),
      });
   });
}
