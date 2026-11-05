import {expect, test} from '../../fixtures';
import {tokenPortalOk} from '../../helpers/portalFixtures';
import {
   landingD1ProntaAguardar,
   landingD1TemaCustomAguardar,
} from '../../helpers/portal/landingD1Helpers';
import {
   mockarAcessoTelefoneNegado,
   O_VIEWPORT_MOBILE_D1,
   expectHeroNaoVisivelMobile,
   C_TOKEN_TEMA_CUSTOM,
} from '../../helpers/portal/d1LoginHelpers';
import {mockarAcessoTelefoneOk, mockarDetalheOsCliente} from '../../helpers/portal/shellD4Helpers';
import {detalheOsMinimoE2E} from '../../helpers/portal/mockDetalheOsMinimo';
import {telefoneAutorizado} from '../../helpers/portalFixtures';

test.describe('E2E — login D1 Portal (TALK-2667)', () => {
   test('CT-E2E-01 — Jornada login D1 até área autenticada', async ({page}) => {
      const cToken = tokenPortalOk();

      await mockarAcessoTelefoneOk(page);
      await mockarDetalheOsCliente(page, detalheOsMinimoE2E(cToken));
      await landingD1ProntaAguardar(page, cToken);

      await expect(page.getByTestId('acesso-assinatura-certtus')).toBeVisible();
      await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();

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
      await expect(page).toHaveURL(new RegExp(`/os/${cToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), {
         timeout: 15_000,
      });
      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible({timeout: 15_000});
   });

   test('CT-E2E-02 — Mobile: formulário e marca sem hero visível', async ({page}) => {
      await page.setViewportSize(O_VIEWPORT_MOBILE_D1);
      await landingD1TemaCustomAguardar(page);

      await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();
      await expect(page.getByTestId('acesso-form-login')).toBeVisible();
      await expect(page.locator('input[name="telefone"]')).toBeVisible();
      await expect(page.getByTestId('acesso-btn-acessar')).toBeEnabled();

      await expectHeroNaoVisivelMobile(page);
   });

   test('CT-E2E-03 — Telefone não autorizado exibe alerta na landing', async ({page}) => {
      await mockarAcessoTelefoneNegado(page);
      await landingD1ProntaAguardar(page, C_TOKEN_TEMA_CUSTOM, 'Oficina Tema Custom');

      await page.locator('input[name="telefone"]').fill('11888887777');
      await page.getByTestId('acesso-btn-acessar').click();

      await expect(page.locator('.acesso-alerta-erro')).toContainText(
         'Acesso não autorizado',
      );
      await expect(page).toHaveURL(
         new RegExp(`/${C_TOKEN_TEMA_CUSTOM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      );
      await expect(page.getByTestId('layout-portal-autenticado')).toHaveCount(0);
   });
});
