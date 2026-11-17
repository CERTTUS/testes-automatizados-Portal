import {expect, test} from '../../fixtures';
import {
   C_TOKEN_CARDS_SEPARADOS,
   C_TOKEN_TEXTO_INVALIDO,
   C_TOKEN_TEXTO_LEGADO,
   C_TOKEN_TEXTO_PERSONALIZADO,
} from '../../../api/modulo-talk-3103-cor-texto-elementos/corTextoElementosApi';
import {
   landingCorTextoAguardar,
   loginPortalCardsSeparados,
   loginPortalLegadoDetalhe,
} from '../../helpers/portal/corTextoElementosHelpers';
import {aplicarTemaT3103Homolog} from '../../helpers/portal/massaCorTextoT3103Homolog';
import {lHomologPortal} from '../../helpers/portal/massaPortal2881';

test.describe('E2E — cor de texto por elemento no portal (TALK-3103)', () => {
   test.describe.configure({mode: 'serial'});

   test.beforeEach(({}, testInfo) => {
      if (lHomologPortal()) {
         testInfo.setTimeout(120_000);
      }
   });
   test.describe('CT-E2E-01 — personalizado', () => {
      test.beforeAll(async ({request}) => {
         await aplicarTemaT3103Homolog(request, 'personalizado', C_TOKEN_TEXTO_PERSONALIZADO);
      });

   test('CT-E2E-01 — Landing exibe textos personalizados por região', async ({page}) => {
      await landingCorTextoAguardar(page, C_TOKEN_TEXTO_PERSONALIZADO);
      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(oTema).toHaveCSS('--portal-login-texto', '#7a2e00');
      await expect(oTema).toHaveCSS('--portal-login-botao-texto', '#ffe8cc');
      await expect(oTema).toHaveCSS('--portal-os-header-texto', '#ffd166');
      await expect(oTema).toHaveCSS('--portal-os-fundo-texto', '#1b4332');
      await expect(oTema).toHaveCSS('--portal-os-card-texto', '#5a189a');
      await expect(oTema).toHaveCSS('--portal-os-footer-texto', '#d8f3dc');
      await expect(page.locator('input[name="telefone"]')).toBeVisible();
   });
   });

   test.describe('CT-E2E-02 — cards separados', () => {
      test.beforeAll(async ({request}) => {
         await aplicarTemaT3103Homolog(request, 'cards', C_TOKEN_CARDS_SEPARADOS);
      });

   test('CT-E2E-02 — Detalhe O.S. exibe cards com fundo e texto próprios', async ({page}) => {
      await loginPortalCardsSeparados(page);
      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(oTema).toHaveCSS('--portal-card-relatorio-bg', '#0f3d73');
      await expect(oTema).toHaveCSS('--portal-card-relatorio-texto', '#ffffff');
      await expect(oTema).toHaveCSS('--portal-card-evolucao-texto', '#1b4332');
      await expect(oTema).toHaveCSS('--portal-card-historico-texto', '#4a148c');
      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
   });
   });

   test.describe('CT-E2E-03 — legado', () => {
      test.beforeAll(async ({request}) => {
         await aplicarTemaT3103Homolog(request, 'legado', C_TOKEN_TEXTO_LEGADO);
      });

   test('CT-E2E-03 — Tema legado sem regressão visual', async ({page}) => {
      await landingCorTextoAguardar(page, C_TOKEN_TEXTO_LEGADO);
      let oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toHaveCSS('--portal-login-texto', '#e0e0e0');
      await expect(oTema).not.toHaveCSS('--portal-login-botao-texto', '#ffe8cc');

      await loginPortalLegadoDetalhe(page);
      oTema = page.getByTestId('tema-portal-aplicar');
      // Legado: loginTexto claro em card branco → contraste escuro no card (temaProducaoDerivar).
      await expect(oTema).toHaveCSS('--portal-os-card-texto', '#171717');
      await expect(oTema).not.toHaveCSS('--portal-os-header-texto', '#ffd166');
   });
   });

   test.describe('CT-E2E-04 — inválido', () => {
      test.beforeAll(async ({request}) => {
         await aplicarTemaT3103Homolog(request, 'invalido', C_TOKEN_TEXTO_INVALIDO);
      });

   test('CT-E2E-04 — Cor de texto inválida não quebra a página', async ({page}) => {
      await landingCorTextoAguardar(page, C_TOKEN_TEXTO_INVALIDO);
      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(page.getByTestId('acesso-form-login')).toBeVisible();
      await expect(page.getByTestId('acesso-btn-acessar')).toBeEnabled();
      const cStyleInvalido = await oTema.evaluate((oEl) => oEl.getAttribute('style') ?? '');
      expect(cStyleInvalido).not.toMatch(/\broxo\b/i);
   });
   });
});