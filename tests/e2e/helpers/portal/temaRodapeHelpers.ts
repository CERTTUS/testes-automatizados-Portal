import {expect, type Locator, type Page} from '@playwright/test';
import {C_TOKEN_OK, C_TOKEN_REVOGADO} from '../portalFixtures';
import {landingD1ProntaAguardar} from './landingD1Helpers';

export type VarianteMarcaEsperada = 'azul' | 'branca';

export function locatorAssinaturaLogin(page: Page): Locator {
   return page.getByTestId('acesso-assinatura-certtus');
}

export function locatorAssinaturaRodapeOs(page: Page): Locator {
   return page.getByTestId('rodape-oficina-portal').getByTestId('acesso-assinatura-certtus');
}

export async function assertVarianteMarca(
   oAssinatura: Locator,
   cVariante: VarianteMarcaEsperada,
): Promise<void> {
   await expect(oAssinatura).toBeVisible();
   await expect(oAssinatura).toHaveAttribute('data-variante', cVariante);
   const cFragmento = cVariante === 'branca' ? 'certtus-logotipo-branco' : 'certtus-logotipo';
   await expect(oAssinatura.locator('img.acesso-assinatura__logotipo')).toHaveAttribute(
      'src',
      new RegExp(cFragmento),
   );
}

export async function previewLoginCenarioAguardar(
   page: Page,
   cCenario: string,
): Promise<void> {
   await page.goto(`/preview/login?cenario=${encodeURIComponent(cCenario)}`);
   await expect(page.getByTestId('acesso-assinatura-certtus')).toBeVisible();
}

export async function previewOsCenarioAguardar(page: Page, cCenario: string): Promise<void> {
   await page.goto(`/preview/os?cenario=${encodeURIComponent(cCenario)}`);
   await expect(page.getByTestId('rodape-oficina-portal')).toBeVisible();
   await page.getByTestId('rodape-oficina-portal').scrollIntoViewIfNeeded();
}

export async function landingClaroAssinaturaAzul(page: Page): Promise<void> {
   await landingD1ProntaAguardar(page, C_TOKEN_OK);
   await assertVarianteMarca(locatorAssinaturaLogin(page), 'azul');
}

export async function linkIndisponivelAssinaturaAzul(page: Page): Promise<void> {
   await page.goto(`/${C_TOKEN_REVOGADO}`);
   await expect(page.getByTestId('portal-link-indisponivel')).toBeVisible();
   await assertVarianteMarca(locatorAssinaturaLogin(page), 'azul');
}