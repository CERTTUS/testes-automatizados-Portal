import {test, expect} from '../../fixtures';
import {
   C_LOGO_URL_HORIZONTAL,
   C_SELETOR_LOGO_LOGIN,
   C_SELETOR_LOGO_MENU,
   C_SELETOR_LOGO_RODAPE,
   C_TOKEN_LOGO_HORIZONTAL,
   C_TOKEN_SEM_LOGO,
   assertLogoProporcionalHorizontal,
   assertSemRolagemHorizontalPagina,
   assertSrcLogoHorizontal,
   assertSrcMarcaPadrao,
   faixasAtuais,
   loginPortalLogoDetalhe,
   landingLogoAguardar,
   srcImagemLogo,
} from '../../helpers/portal/logoFormatoHelpers';
import {lHomologPortal} from '../../helpers/portal/massaPortal2881';

test.describe('E2E — logo da oficina no portal (TALK-3105)', () => {
   test.describe.configure({mode: 'serial'});

   test.beforeEach(({}, testInfo) => {
      if (lHomologPortal()) {
         testInfo.setTimeout(120_000);
      }
   });

   test.describe('CT-E2E-01 — logo horizontal nas três superfícies', () => {
      test('CT-E2E-01 — Login, menu e rodapé exibem logo horizontal proporcional', async ({page}) => {
         await landingLogoAguardar(page, C_TOKEN_LOGO_HORIZONTAL);
         const cSrcLogin = await srcImagemLogo(page, C_SELETOR_LOGO_LOGIN);
         await assertSrcLogoHorizontal(cSrcLogin);

         await loginPortalLogoDetalhe(page, C_TOKEN_LOGO_HORIZONTAL, C_LOGO_URL_HORIZONTAL);

         const cSrcMenu = await srcImagemLogo(page, C_SELETOR_LOGO_MENU);
         const cSrcRodape = await srcImagemLogo(page, C_SELETOR_LOGO_RODAPE);
         await assertSrcLogoHorizontal(cSrcMenu);
         await assertSrcLogoHorizontal(cSrcRodape);

         const oFaixas = faixasAtuais(page);
         await assertLogoProporcionalHorizontal(page, C_SELETOR_LOGO_MENU, oFaixas.menu);
         await assertLogoProporcionalHorizontal(page, C_SELETOR_LOGO_RODAPE, oFaixas.rodape);
      });
   });

   test.describe('CT-E2E-02 — portal sem logo customizada', () => {
      test('CT-E2E-02 — Marca padrão no login, menu e rodapé', async ({page}) => {
         await landingLogoAguardar(page, C_TOKEN_SEM_LOGO);
         const cSrcLogin = await srcImagemLogo(page, C_SELETOR_LOGO_LOGIN);
         await assertSrcMarcaPadrao(cSrcLogin);

         await loginPortalLogoDetalhe(page, C_TOKEN_SEM_LOGO, '');

         const cSrcMenu = await srcImagemLogo(page, C_SELETOR_LOGO_MENU);
         const cSrcRodape = await srcImagemLogo(page, C_SELETOR_LOGO_RODAPE);
         await assertSrcMarcaPadrao(cSrcMenu);
         await assertSrcMarcaPadrao(cSrcRodape);
         expect(cSrcMenu.toLowerCase()).not.toContain(C_LOGO_URL_HORIZONTAL.toLowerCase());
      });
   });

   test.describe('CT-E2E-03 — viewport mobile sem rolagem horizontal', () => {
      test('CT-E2E-03 — Menu e rodapé contidos em ~390px', async ({page}) => {
         await page.setViewportSize({width: 390, height: 844});
         await loginPortalLogoDetalhe(page, C_TOKEN_LOGO_HORIZONTAL, C_LOGO_URL_HORIZONTAL);

         await assertSemRolagemHorizontalPagina(page);
         await expect(page.locator(C_SELETOR_LOGO_MENU).first()).toBeVisible();
         await expect(page.locator(C_SELETOR_LOGO_RODAPE).first()).toBeVisible();

         const oFaixas = faixasAtuais(page);
         await assertLogoProporcionalHorizontal(page, C_SELETOR_LOGO_MENU, oFaixas.menu);
         await assertLogoProporcionalHorizontal(page, C_SELETOR_LOGO_RODAPE, oFaixas.rodape);
      });
   });
});