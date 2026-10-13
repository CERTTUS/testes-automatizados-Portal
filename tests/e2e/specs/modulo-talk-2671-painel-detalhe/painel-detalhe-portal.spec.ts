import {expect, test} from '../../fixtures';
import {C_TOKEN_OK} from '../../helpers/portalFixtures';
import {
   abrirDetalheOsAutenticadoMock,
   cookieSessaoPortalE2e,
   mockarDetalheOsFalhaHttp,
} from '../../helpers/portal/d4ConteudoHelpers';
import {
   detalheOsPainelComTimeline,
   detalheOsPainelSemTimeline,
} from '../../helpers/portal/painelDetalheMocks';

const VIEWPORT_DESKTOP = {width: 1280, height: 720};
const VIEWPORT_MOBILE = {width: 390, height: 844};

test.describe('E2E — painel detalhe OS (TALK-2671)', () => {
   test('CT-E2E-01 — Timeline preenchida: grade desktop e abas mobile', async ({
      page,
      context,
   }) => {
      await page.setViewportSize(VIEWPORT_DESKTOP);
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsPainelComTimeline(),
      );

      const oPainel = page.getByTestId('painel-detalhe-os');
      await expect(oPainel).toBeVisible();
      await expect(page.getByTestId('painel-evolucao-os')).toBeVisible();
      await expect(page.getByTestId('relatorio-servico-os')).toBeVisible();
      await expect(
         page.getByRole('heading', {name: 'Relatório de Serviço'}),
      ).toBeVisible();

      await page.setViewportSize(VIEWPORT_MOBILE);
      await page.getByRole('tab', {name: 'Evolução da OS'}).click();
      await expect(page.getByTestId('painel-evolucao-os')).toBeVisible();
      await expect(page.getByTestId('relatorio-servico-os')).toBeHidden();
   });

   test('CT-E2E-02 — Integração com timeline vazia (paridade FR-016)', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsPainelSemTimeline(),
      );

      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toBeVisible();
      await expect(page.getByTestId('painel-detalhe-os')).toBeVisible();
      await expect(page.getByText('Relatório de Serviço')).toBeVisible();
      await expect(page.getByTestId('painel-evolucao-os')).toHaveCount(0);
      await expect(page.getByRole('tab', {name: 'Evolução da OS'})).toHaveCount(0);
      await expect(page.getByRole('tablist', {name: 'Visão principal (mobile)'})).toHaveCount(
         0,
      );
   });

   test('CT-E2E-03 — Card do relatório no padrão flat D4 (FR-011)', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsPainelSemTimeline(),
      );

      const oRelatorio = page.getByTestId('relatorio-servico-os');
      await expect(oRelatorio).toBeVisible();
      await expect(page.getByTestId('painel-detalhe-os')).toContainText('001046');
      await expect(oRelatorio).toContainText('XYZ9E99');
      await expect(oRelatorio).toHaveClass(/autenticado-d4__card/);
   });

   test('CT-E2E-04 — Erro do BFF ao carregar detalhe da OS', async ({page, context}) => {
      await cookieSessaoPortalE2e(context);
      await mockarDetalheOsFalhaHttp(page, 500);
      await page.goto(`/os/${encodeURIComponent(C_TOKEN_OK)}`);

      await expect(page.getByTestId('painel-detalhe-os')).toHaveCount(0);
      await expect(page.getByTestId('painel-evolucao-os')).toHaveCount(0);
      await expect(page.getByTestId('relatorio-servico-os')).toHaveCount(0);
      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toHaveCount(0);
      await expect(page.getByTestId('mensagem-erro-detalhe-os-autenticado')).toBeVisible();
      await expect(page.getByTestId('mensagem-erro-detalhe-os-autenticado')).toContainText(
         /Não foi possível (carregar o detalhe|concluir a solicitação)/i,
      );
   });
});
