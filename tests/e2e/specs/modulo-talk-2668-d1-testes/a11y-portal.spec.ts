import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page} from '../../fixtures';
import {C_TOKEN_OK, C_TOKEN_REVOGADO} from '../../helpers/portalFixtures';
import {landingD1ProntaAguardar} from '../../helpers/portal/landingD1Helpers';
import {mockarAcessoTelefoneNegado} from '../../helpers/portal/d1LoginHelpers';
import {
   C_AXE_TAGS,
   expectAxeSemCriticalSerious,
} from '../../helpers/portal/axeViolacoesFiltrar';

const N_ALVO_TOQUE_MIN_PX = 44;

async function axeAnalisarPagina(oPage: Page) {
   return new AxeBuilder({page: oPage})
      .withTags([...C_AXE_TAGS])
      .analyze();
}

test.describe('E2E — a11y D1 Portal (TALK-2668)', () => {
   test.describe.configure({mode: 'serial'});
   test('CT-E2E-01 — Landing sem violações critical/serious (axe)', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);
      expectAxeSemCriticalSerious(await axeAnalisarPagina(page));
   });

   test('CT-E2E-02 — Formulário de telefone sem violações critical/serious (axe)', async ({
      page,
   }) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);
      const oResultado = await new AxeBuilder({page})
         .include('form.acesso-form')
         .withTags([...C_AXE_TAGS])
         .analyze();
      expectAxeSemCriticalSerious(oResultado);
   });

   test('CT-E2E-03 — Erro 403 com alerta acessível e axe limpo', async ({page}) => {
      await mockarAcessoTelefoneNegado(page);
      await landingD1ProntaAguardar(page, C_TOKEN_OK);
      await page.locator('input[name="telefone"]').fill('11888887777');
      await page.getByTestId('acesso-btn-acessar').click();

      await expect(page.locator('.acesso-alerta-erro')).toContainText('Acesso não autorizado');
      await expect(page.locator('.acesso-alerta-erro')).toHaveAttribute('role', 'alert');

      expectAxeSemCriticalSerious(await axeAnalisarPagina(page));
   });

   test('CT-E2E-04 — Link revogado sem violações critical/serious (axe)', async ({page}) => {
      await page.goto(`/${C_TOKEN_REVOGADO}`);
      await expect(page.getByText('Link indisponível')).toBeVisible();

      expectAxeSemCriticalSerious(await axeAnalisarPagina(page));
   });

   test('CT-E2E-05 — Navegação por teclado no formulário', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oInput = page.locator('input[name="telefone"]');
      const oBotao = page.getByTestId('acesso-btn-acessar');

      await page.keyboard.press('Tab');
      await expect(oInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(oBotao).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(oInput).toBeFocused();

      await oInput.fill('11888887777');
      await page.keyboard.press('Tab');
      await expect(oBotao).toBeFocused();

      await mockarAcessoTelefoneNegado(page);
      await page.keyboard.press('Enter');
      await expect(page.locator('.acesso-alerta-erro')).toContainText('Acesso não autorizado');
   });

   test('CT-E2E-06 — Focus visível no botão Acessar', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oBotao = page.getByTestId('acesso-btn-acessar');
      await oBotao.focus();

      const oOutline = await oBotao.evaluate((oEl) => {
         const oEstilo = window.getComputedStyle(oEl);
         return {
            outlineWidth: oEstilo.outlineWidth,
            outlineStyle: oEstilo.outlineStyle,
         };
      });

      expect(oOutline.outlineWidth !== '0px' && oOutline.outlineStyle !== 'none').toBeTruthy();
   });

   test('CT-E2E-07 — Semântica main, label e atributos do telefone', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina E2E');

      const oInput = page.locator('input[name="telefone"]');
      const cInputId = await oInput.getAttribute('id');
      expect(cInputId).toBeTruthy();

      const oLabel = page.locator(`label[for="${cInputId}"]`);
      await expect(oLabel).toHaveText('Telefone');
      await expect(oInput).toHaveAttribute('autocomplete', 'tel');
      await expect(oInput).toHaveAttribute('inputmode', 'numeric');
   });

   test('CT-E2E-08 — Alvo de toque mínimo 44px no botão Acessar', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oBotao = page.getByTestId('acesso-btn-acessar');
      const oBox = await oBotao.boundingBox();
      expect(oBox).not.toBeNull();
      expect(oBox!.height).toBeGreaterThanOrEqual(N_ALVO_TOQUE_MIN_PX);
      expect(oBox!.width).toBeGreaterThanOrEqual(N_ALVO_TOQUE_MIN_PX);
   });

   test('CT-E2E-09 — Contraste do botão Acessar (axe color-contrast)', async ({page}) => {
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oResultado = await new AxeBuilder({page})
         .include('.acesso-botao')
         .withRules(['color-contrast'])
         .analyze();

      expectAxeSemCriticalSerious(oResultado);
   });

   test('CT-E2E-10 — prefers-reduced-motion desativa transições', async ({page}) => {
      await page.emulateMedia({reducedMotion: 'reduce'});
      await landingD1ProntaAguardar(page, C_TOKEN_OK);

      const oEstilos = await page.evaluate(() => {
         const oBotao = document.querySelector('.acesso-botao');
         const oSpinner = document.querySelector('.acesso-botao__spinner');
         if (!oBotao) {
            return null;
         }
         const oBotaoEstilo = window.getComputedStyle(oBotao);
         const oSpinnerEstilo = oSpinner ? window.getComputedStyle(oSpinner) : null;
         return {
            cTransicaoBotao: oBotaoEstilo.transitionDuration,
            cAnimacaoSpinner: oSpinnerEstilo?.animationName ?? 'none',
         };
      });

      expect(oEstilos).not.toBeNull();
      expect(oEstilos!.cTransicaoBotao).toBe('0s');
      expect(oEstilos!.cAnimacaoSpinner).toBe('none');
   });
});
