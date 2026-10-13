import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';
import {
   landingD1ProntaAguardar,
   landingD1TemaCustomAguardar,
   O_VIEWPORT_DESKTOP_D1,
} from '../../e2e/helpers/portal/landingD1Helpers';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';

test.describe('Smoke — login D1 (TALK-2667)', () => {
   test('CT-SMK-04 — Assinatura CERTTUS no rodapé do painel-form', async ({page}, testInfo) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oAssinatura = page.getByTestId('acesso-assinatura-certtus');
      await expect(oAssinatura).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-04', 1, 'assinatura-certtus');
      await expect(oAssinatura).toHaveAttribute(
         'href',
         'https://www.certtus.com.br/',
      );
      await expect(page.getByText('Criado por')).toBeVisible();
      await expect(page.getByAltText('CERTTUS')).toBeVisible();
      await expect(page.locator('.acesso-form-inner')).not.toContainText('Criado por');
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-04', 2, 'fora-form-inner');
   });

   test('CT-SMK-07 — Hero dinâmico em desktop (tema custom)', async ({page}, testInfo) => {
      await page.setViewportSize(O_VIEWPORT_DESKTOP_D1);
      await landingD1TemaCustomAguardar(page);

      await expect(page.getByTestId('acesso-layout-shell')).toBeVisible();
      const oHero = page.locator('.acesso-painel-hero--com-imagem');
      await expect(oHero).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-07', 1, 'hero-com-imagem');
      await expect(page.locator('.acesso-painel-hero__imagem')).toBeVisible();
      const oTema = page.locator('.tema-portal-aplicar');
      await expect(oTema).toHaveCSS('--cor-primaria', '#6c3483');
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-07', 2, 'tema-custom-aplicado');
   });
});
