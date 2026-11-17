import {expect, test} from '../../e2e/fixtures';
import {
   assertCaixaTelefoneSemFundoAmarelo,
   interagirCampoTelefoneBlur,
   landingLoginClaroPronta,
   landingLoginEscuroPronta,
} from '../../e2e/helpers/portal/loginCampoFundoHelpers';

test.describe('Smoke — login telefone fundo do campo (IN-947)', () => {
   test('CT-SMK-01 — Formulário de login telefone visível', async ({page}) => {
      await landingLoginClaroPronta(page);
      await expect(page.locator('input[name="telefone"]')).toBeEnabled();
      await expect(page.getByTestId('acesso-btn-acessar')).toBeVisible();
   });

   test('CT-SMK-02 — Fundo do campo após blur no tema claro', async ({page}) => {
      await landingLoginClaroPronta(page);
      await interagirCampoTelefoneBlur(page);
   });

   test('CT-SMK-03 — Fundo do campo no tema escuro após interação', async ({page}) => {
      await landingLoginEscuroPronta(page);
      const oInput = page.locator('input[name="telefone"]');
      await oInput.click();
      await oInput.fill('11999999999');
      await page.getByTestId('acesso-assinatura-certtus').click({force: true});
      await assertCaixaTelefoneSemFundoAmarelo(page);
   });
});