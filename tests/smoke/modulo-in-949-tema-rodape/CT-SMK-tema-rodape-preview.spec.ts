import {test} from '../../e2e/fixtures';
import {
   assertVarianteMarca,
   locatorAssinaturaLogin,
   locatorAssinaturaRodapeOs,
   previewLoginCenarioAguardar,
   previewOsCenarioAguardar,
} from '../../e2e/helpers/portal/temaRodapeHelpers';

test.describe('Smoke — logo CERTTUS no rodapé/login (IN-949)', () => {
   test('CT-SMK-01 — Preview login tema claro com marca azul', async ({page}) => {
      await previewLoginCenarioAguardar(page, 'rodape-claro');
      await assertVarianteMarca(locatorAssinaturaLogin(page), 'azul');
   });

   test('CT-SMK-02 — Preview login tema escuro com marca branca', async ({page}) => {
      await previewLoginCenarioAguardar(page, 'rodape-escuro');
      await assertVarianteMarca(locatorAssinaturaLogin(page), 'branca');
   });

   test('CT-SMK-03 — Preview O.S. intermediário escuro com marca branca no rodapé', async ({page}) => {
      await previewOsCenarioAguardar(page, 'rodape-intermediario-escuro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'branca');
   });
});