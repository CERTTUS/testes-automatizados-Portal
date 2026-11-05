import {expect, type Page} from '@playwright/test';
import {
   C_TOKEN_SEM_TOKENS_DERIVADOS,
   C_TOKEN_TOKENS_INVALIDOS,
   telefoneAutorizado,
   tokenPortalOk,
} from '../portalFixtures';
import {landingD1ProntaAguardar} from './landingD1Helpers';
import {mockarAcessoTelefoneOk, mockarDetalheOsCliente} from './shellD4Helpers';
import {detalheOsMinimoE2E} from './mockDetalheOsMinimo';

export async function landingSemTokensDerivadosAguardar(page: Page): Promise<void> {
   await page.goto(`/${C_TOKEN_SEM_TOKENS_DERIVADOS}`);
   await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();
   await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina Sem Tema');
   await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
      'data-hidratado',
      'true',
   );
}

export async function landingTokensInvalidosAguardar(page: Page): Promise<void> {
   await page.goto(`/${C_TOKEN_TOKENS_INVALIDOS}`);
   await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();
   await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina Tokens Mix');
   await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
      'data-hidratado',
      'true',
   );
}

export async function loginPortalAteAreaAutenticada(page: Page): Promise<string> {
   const cToken = tokenPortalOk();
   await mockarAcessoTelefoneOk(page);
   await mockarDetalheOsCliente(page, detalheOsMinimoE2E(cToken));
   await landingD1ProntaAguardar(page, cToken);

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
   );

   const cTel = telefoneAutorizado().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();

   expect((await oRespostaPromise).status()).toBe(200);
   await expect(page).toHaveURL(
      new RegExp(`/os/${cToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      {timeout: 15_000},
   );
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible({
      timeout: 15_000,
   });
   return cToken;
}
