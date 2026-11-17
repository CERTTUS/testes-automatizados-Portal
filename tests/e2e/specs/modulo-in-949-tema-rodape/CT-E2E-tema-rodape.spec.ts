import {test} from '../../fixtures';
import {
   assertVarianteMarca,
   landingClaroAssinaturaAzul,
   linkIndisponivelAssinaturaAzul,
   locatorAssinaturaRodapeOs,
   previewLoginCenarioAguardar,
   previewOsCenarioAguardar,
} from '../../helpers/portal/temaRodapeHelpers';

test.describe('E2E — contraste da marca CERTTUS (IN-949)', () => {
   test('CT-E2E-01 — Landing padrão clara: assinatura azul no login', async ({page}) => {
      await landingClaroAssinaturaAzul(page);
   });

   test('CT-E2E-02 — Preview O.S. tema escuro: marca branca no rodapé (CT-2 parcial)', async ({page}) => {
      await previewOsCenarioAguardar(page, 'rodape-escuro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'branca');
   });

   test('CT-E2E-03 — Cenários intermediários do preview O.S. (CT-5)', async ({page}) => {
      await previewOsCenarioAguardar(page, 'rodape-intermediario-escuro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'branca');

      await previewOsCenarioAguardar(page, 'rodape-intermediario-claro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'azul');
   });

   test('CT-E2E-04 — Personalização avançada fundo escuro no login e no rodapé (CT-3 parcial)', async ({page}) => {
      await previewLoginCenarioAguardar(page, 'rodape-personalizado-escuro');
      await assertVarianteMarca(page.getByTestId('acesso-assinatura-certtus'), 'branca');

      await previewOsCenarioAguardar(page, 'rodape-personalizado-escuro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'branca');
   });

   test('CT-E2E-05 — Tema escuro com rodapé claro no avançado (CT-4 parcial)', async ({page}) => {
      await previewOsCenarioAguardar(page, 'rodape-personalizado-claro');
      await assertVarianteMarca(locatorAssinaturaRodapeOs(page), 'azul');
   });

   test('CT-E2E-06 — Link indisponível mantém marca azul (CT-7)', async ({page}) => {
      await linkIndisponivelAssinaturaAzul(page);
   });
});