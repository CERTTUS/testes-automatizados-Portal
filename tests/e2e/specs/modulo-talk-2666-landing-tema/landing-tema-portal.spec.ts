import {expect, test} from '../../fixtures';
import {
   landingSemTokensDerivadosAguardar,
   landingTokensInvalidosAguardar,
   loginPortalAteAreaAutenticada,
} from '../../helpers/portal/landingTemaHelpers';

test.describe('E2E — landing tema portal (TALK-2666 / TALK-2748)', () => {
   test('CT-E2E-01 — Landing sem tokens derivados', async ({page}) => {
      await landingSemTokensDerivadosAguardar(page);
      await expect(page.getByRole('button', {name: 'Acessar'})).toBeVisible();
      await expect(page.locator('input[name="telefone"]')).toBeVisible();
      await expect(page.getByTestId('tema-portal-aplicar')).toHaveCount(0);
   });

   test('CT-E2E-02 — Tema no shell autenticado', async ({page}) => {
      await loginPortalAteAreaAutenticada(page);
      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(oTema).toHaveClass(/min-h-0/);
      await expect(oTema).toHaveCSS('--theme-action-primary', '#1a5276');
      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
   });

   test('CT-E2E-03 — Ignorar chaves que não são custom properties CSS', async ({
      page,
   }) => {
      await landingTokensInvalidosAguardar(page);
      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(oTema).toHaveCSS('--cor-primaria', '#c0392b');
      const cStyle = await oTema.evaluate((oEl) => oEl.getAttribute('style') ?? '');
      expect(cStyle).not.toMatch(/\bcolor\s*:/i);
   });
});
