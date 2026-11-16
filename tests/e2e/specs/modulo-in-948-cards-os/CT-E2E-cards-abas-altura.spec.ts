import {expect, test} from '../../fixtures';
import {
   abrirPreviewOs,
   alturaPainelAbasPx,
   clicarAbaOs,
   expectAlturasProximas,
   expectPainelSemRolagemInterna,
   percorrerAbasVaziasEFrases,
} from '../../helpers/portal/cardsOsAbasHelpers';

test.describe('E2E — cards e abas da O.S. (IN-948)', () => {
   test('CT-E2E-01 — Abas vazias mantém tamanho ao alternar', async ({page}) => {
      await abrirPreviewOs(page, 'vazio');
      const mAlturas = await percorrerAbasVaziasEFrases(page);
      expectAlturasProximas(mAlturas);
   });

   test('CT-E2E-02 — Poucos itens de checklist ocupam o quadro', async ({page}) => {
      await abrirPreviewOs(page, 'vazio');
      const nAlturaVazio = await alturaPainelAbasPx(page);

      await abrirPreviewOs(page, 'checklist-2');
      await expect(page.getByTestId('tabela-checklist')).toBeVisible();
      const nAlturaPoucos = await alturaPainelAbasPx(page);
      expect(nAlturaPoucos).toBeGreaterThanOrEqual(nAlturaVazio - 8);
   });

   test('CT-E2E-03 — Muitos itens sem rolagem interna no painel', async ({page}) => {
      await abrirPreviewOs(page, 'muitos-itens');
      await clicarAbaOs(page, 'checklist');
      await expect(page.getByTestId('tabela-checklist')).toBeVisible();
      await expectPainelSemRolagemInterna(page);

      await clicarAbaOs(page, 'servicos');
      await expectPainelSemRolagemInterna(page);
      await clicarAbaOs(page, 'pecas');
      await expectPainelSemRolagemInterna(page);
   });

   test('CT-E2E-04 — Foto quebrada mostra Foto indisponível', async ({page}) => {
      await abrirPreviewOs(page, 'foto-quebrada');
      await clicarAbaOs(page, 'fotos');
      const oIndisponivel = page.getByTestId('foto-os-indisponivel').first();
      await expect(oIndisponivel).toBeVisible();
      await oIndisponivel.click();
      const oLightboxIndisponivel = page.getByTestId('lightbox-foto-indisponivel');
      await expect(oLightboxIndisponivel).toBeVisible();
      await expect(oLightboxIndisponivel).toContainText('Foto indisponível');
   });

   test('CT-E2E-05 — Erro ao carregar fotos com Tentar novamente', async ({page}) => {
      await abrirPreviewOs(page, 'erro');
      await clicarAbaOs(page, 'fotos');
      await expect(
         page.getByText('Não foi possível carregar as fotos agora.'),
      ).toBeVisible();
      await expect(page.getByRole('button', {name: 'Tentar novamente'})).toBeVisible();
      const nAlturaErro = await alturaPainelAbasPx(page);

      await abrirPreviewOs(page, 'vazio');
      await clicarAbaOs(page, 'fotos');
      const nAlturaVazio = await alturaPainelAbasPx(page);
      expect(Math.abs(nAlturaErro - nAlturaVazio)).toBeLessThanOrEqual(32);
   });

   test('CT-E2E-06 — Dado malformado filtra itens inválidos', async ({page}) => {
      await abrirPreviewOs(page, 'malformado');
      await clicarAbaOs(page, 'servicos');
      await expect(page.getByText('Outros serviços')).toBeVisible();
      await clicarAbaOs(page, 'checklist');
      await expect(page.getByText('—').first()).toBeVisible();
      await clicarAbaOs(page, 'pecas');
      await expect(page.getByTestId('tabela-vazia-pecas')).toBeVisible();
   });
});