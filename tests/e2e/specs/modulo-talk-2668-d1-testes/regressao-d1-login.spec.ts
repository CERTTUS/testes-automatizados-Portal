import {expect, test} from '../../fixtures';
import {C_TOKEN_REVOGADO, tokenPortalOk} from '../../helpers/portalFixtures';
import {loginD1AteOsAguardar} from '../../helpers/portal/d1LoginHelpers';

test.describe('E2E — regressão login D1 (TALK-2668)', () => {
   test('CT-E2E-11 — Login ok redireciona para /os/{token}', async ({page}) => {
      const cToken = tokenPortalOk();
      await loginD1AteOsAguardar(page, cToken);
   });

   test('CT-E2E-12 — Link revogado sem formulário (regressão funcional)', async ({page}) => {
      await page.goto(`/${C_TOKEN_REVOGADO}`);
      await expect(page.getByTestId('portal-link-indisponivel')).toBeVisible();
      await expect(page.getByText('Link indisponível')).toBeVisible();
      await expect(page.locator('input[name="telefone"]')).not.toBeVisible();
   });
});
