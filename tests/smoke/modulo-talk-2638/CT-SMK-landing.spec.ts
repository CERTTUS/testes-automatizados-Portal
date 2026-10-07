import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK, C_TOKEN_REVOGADO} from '../../e2e/helpers/portalFixtures';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';

test.describe('Smoke — landing portal (TALK-2666)', () => {
   test('CT-SMK-01 — Tela de acesso com marca', async ({page}, testInfo) => {
      await page.goto(`/${C_TOKEN_OK}`);
      await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina E2E');
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-01', 1, 'landing-marca');
      await expect(page.getByRole('button', {name: 'Acessar'})).toBeVisible();
      await expect(page.locator('input[name="telefone"]')).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-01', 2, 'formulario-acesso');
   });

   test('CT-SMK-02 — Tema aplicado na landing', async ({page}, testInfo) => {
      await page.goto(`/${C_TOKEN_OK}`);
      await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina E2E');
      const oTema = page.locator('.tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-02', 1, 'wrapper-tema');
      await expect(oTema).toHaveCSS('--cor-primaria', '#1a5276');
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-02', 2, 'cor-primaria-aplicada');
   });

   test('CT-SMK-03 — Link revogado sem formulário', async ({page}, testInfo) => {
      await page.goto(`/${C_TOKEN_REVOGADO}`);
      await expect(page.getByText('Link indisponível')).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-03', 1, 'link-revogado');
      await expect(page.locator('input[name="telefone"]')).toHaveCount(0);
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-03', 2, 'sem-formulario');
   });
});
