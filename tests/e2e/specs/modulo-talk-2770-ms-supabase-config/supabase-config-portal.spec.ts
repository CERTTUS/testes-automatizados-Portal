import {expect, test} from '../../fixtures';
import {C_TOKEN_ABAS_FILTRADAS, C_TOKEN_TEMA_CUSTOM} from '../../helpers/portalFixtures';
import {abrirDetalheOsAutenticadoMock} from '../../helpers/portal/d4ConteudoHelpers';
import {landingD1TemaCustomAguardar} from '../../helpers/portal/landingD1Helpers';
import {detalheOsAbasFiltradasE2E} from '../../helpers/portal/t2770EnrichHelpers';

test.describe('E2E — enrich Supabase portal_cliente_config (TALK-2770)', () => {
   test('CT-E2E-01 — Landing com tema Supabase aplicado na UI', async ({page}) => {
      await landingD1TemaCustomAguardar(page);

      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(page.locator('.acesso-marca__nome')).toHaveText('Oficina Tema Custom');
      await expect(oTema).toHaveCSS('--cor-primaria', '#6c3483');
      await expect(oTema).toHaveCSS('--theme-action-primary', '#6c3483');
   });

   test('CT-E2E-02 — Detalhe autenticado exibe abas conforme mAbasOrdem', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsAbasFiltradasE2E(),
         C_TOKEN_ABAS_FILTRADAS,
      );

      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
      await expect(page.getByTestId('painel-detalhe-os')).toBeVisible();

      const oTablist = page.getByRole('tablist', {name: 'Abas do portal'});
      await expect(oTablist).toBeVisible();
      await expect(oTablist.getByRole('tab', {name: 'Checklist'})).toBeVisible();
      await expect(oTablist.getByRole('tab', {name: 'Peças'})).toBeVisible();
      await expect(oTablist.getByRole('tab', {name: 'Fotos'})).toHaveCount(0);
      await expect(oTablist.getByRole('tab', {name: 'Serviços'})).toHaveCount(0);
   });
});
