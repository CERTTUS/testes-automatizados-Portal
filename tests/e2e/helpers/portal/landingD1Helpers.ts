import {expect, type Page} from '@playwright/test';
import {
   C_TOKEN_OK,
   C_TOKEN_TEMA_CUSTOM,
} from '../portalFixtures';

/** Viewport desktop — painel hero visível (LayoutAcesso D1). */
export const O_VIEWPORT_DESKTOP_D1 = {width: 1280, height: 800};

export async function landingD1ProntaAguardar(
   page: Page,
   cToken: string = C_TOKEN_OK,
   cNomeMarca = 'Oficina E2E',
): Promise<void> {
   await page.goto(`/${cToken}`);
   const oCabecalho = page.getByTestId('acesso-cabecalho-marca');
   await expect(oCabecalho).toBeVisible();
   await expect(oCabecalho).toHaveClass(/acesso-marca--login/);
   await expect(page.locator('.acesso-marca__nome')).toHaveText(cNomeMarca);
   await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
      'data-hidratado',
      'true',
   );
}

export async function landingD1TemaCustomAguardar(page: Page): Promise<void> {
   await landingD1ProntaAguardar(
      page,
      C_TOKEN_TEMA_CUSTOM,
      'Oficina Tema Custom',
   );
}
