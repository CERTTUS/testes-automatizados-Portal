import {expect, test} from '../../e2e/fixtures';
import {abrirPreviewOs} from '../../e2e/helpers/portal/cardsOsAbasHelpers';

test.describe('Smoke — cards O.S. altura e vazio (IN-948)', () => {
   test('CT-SMK-01 — Preview O.S. vazio: painel de abas e checklist vazio', async ({page}) => {
      await abrirPreviewOs(page, 'vazio');
      await expect(page.getByTestId('aba-os-checklist')).toBeVisible();
      await expect(page.getByTestId('tabela-vazia-checklist')).toBeVisible();
      await expect(
         page.getByText('Nenhum item de checklist registrado para esta O.S.'),
      ).toBeVisible();
      await expect(page.getByTestId('estado-painel-aba-imagem')).toBeVisible();
   });
});