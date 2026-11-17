import {expect, test} from '../../fixtures';
import {tokenPortalOk} from '../../helpers/portalFixtures';
import {mockarAcessoTelefoneNegado, loginD1AteOsAguardar} from '../../helpers/portal/d1LoginHelpers';
import {detalheOsMinimoE2E} from '../../helpers/portal/mockDetalheOsMinimo';
import {mockarDetalheOsCliente} from '../../helpers/portal/shellD4Helpers';
import {
   assertCaixaTelefoneSemFundoAmarelo,
   interagirCampoTelefoneBlur,
   landingLoginClaroPronta,
   telefoneDigitosUi,
} from '../../helpers/portal/loginCampoFundoHelpers';

test.describe('E2E — fundo do campo login telefone (IN-947)', () => {
   test('CT-E2E-01 — Interação no campo mantém aparência do cartão', async ({page}) => {
      await landingLoginClaroPronta(page);
      await interagirCampoTelefoneBlur(page);
      await expect(page.locator('label').filter({hasText: 'Telefone'})).toBeVisible();
   });

   test('CT-E2E-02 — Login feliz após correção visual', async ({page}) => {
      const cToken = tokenPortalOk();
      await loginD1AteOsAguardar(page, cToken);
   });

   test('CT-E2E-03 — Campo desabilitado ao autenticar', async ({page}) => {
      await landingLoginClaroPronta(page);
      await page.route('**/api/bff/acesso/telefone', async (route) => {
         if (route.request().method() !== 'POST') {
            await route.continue();
            return;
         }
         await new Promise((resolve) => setTimeout(resolve, 1_500));
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
               lSucesso: true,
               oDados: {cOsPublicId: 'e2e-os-pendente'},
            }),
         });
      });
      await mockarDetalheOsCliente(page, detalheOsMinimoE2E(tokenPortalOk()));

      const oInput = page.locator('input[name="telefone"]');
      await oInput.fill(telefoneDigitosUi());
      await page.getByTestId('acesso-btn-acessar').click();

      await expect(oInput).toBeDisabled();
      await expect(page.locator('.ds-cf-root[data-disabled]')).toBeVisible();
      await expect(page.getByText('Autenticando…')).toBeVisible();
      await assertCaixaTelefoneSemFundoAmarelo(page);
   });

   test('CT-E2E-04 — Telefone não autorizado na interface', async ({page}) => {
      await landingLoginClaroPronta(page);
      await mockarAcessoTelefoneNegado(page);
      await page.locator('input[name="telefone"]').fill(telefoneDigitosUi());
      await page.getByTestId('acesso-btn-acessar').click();
      await expect(page.locator('.acesso-alerta-erro')).toContainText(/não autorizado/i);
      await expect(page).not.toHaveURL(/\/os\//);
   });
});