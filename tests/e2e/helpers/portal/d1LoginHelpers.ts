import {expect, type Page} from '@playwright/test';
import {C_TOKEN_OK, C_TOKEN_TEMA_CUSTOM, telefoneAutorizado, tokenPortalOk} from '../portalFixtures';
import {mockarAcessoTelefoneOk, mockarDetalheOsCliente} from './shellD4Helpers';
import {detalheOsMinimoE2E} from './mockDetalheOsMinimo';
import {landingD1ProntaAguardar} from './landingD1Helpers';

export const O_VIEWPORT_MOBILE_D1 = {width: 390, height: 844};

export async function mockarAcessoTelefoneNegado(
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

export async function loginD1AteOsAguardar(
   page: Page,
   cToken = tokenPortalOk(),
   cNomeMarca = 'Oficina E2E',
): Promise<void> {
   await mockarAcessoTelefoneOk(page);
   await mockarDetalheOsCliente(page, detalheOsMinimoE2E(cToken));
   await landingD1ProntaAguardar(page, cToken, cNomeMarca);

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
   );

   const cTel = telefoneAutorizado().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();

   const oResposta = await oRespostaPromise;
   expect(oResposta.status()).toBe(200);

   await expect(page).toHaveURL(new RegExp(`/os/${cToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), {
      timeout: 15_000,
   });
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible({timeout: 15_000});
}

export async function expectHeroDesktopVisivel(page: Page): Promise<void> {
   const oHero = page.locator('.acesso-painel-hero--com-imagem');
   await expect(oHero).toBeVisible();
}

export async function expectHeroNaoVisivelMobile(page: Page): Promise<void> {
   const oHero = page.locator('.acesso-painel-hero--com-imagem');
   await expect(oHero).not.toBeVisible();
}

export {C_TOKEN_OK, C_TOKEN_TEMA_CUSTOM};
