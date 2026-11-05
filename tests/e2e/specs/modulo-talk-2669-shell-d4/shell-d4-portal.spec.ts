import {expect, test} from '../../fixtures';
import {tokenPortalOk} from '../../helpers/portalFixtures';
import {
   expectContrasteBotaoSairMinimo,
   expectPaginaAcessoPublicaPosSair,
   loginOsD4v2CompletoAguardar,
   loginTelefonePortalAguardar,
   mockarDetalheOsCliente,
   mockarSairPortal,
} from '../../helpers/portal/shellD4Helpers';
import {detalheOsMinimoE2E} from '../../helpers/portal/mockDetalheOsMinimo';
import {ShellD4PortalPage} from '../../pages/ShellD4PortalPage';

test.describe('E2E — shell D4_v2 Portal (TALK-2669)', () => {
   test('CT-E2E-01 — Jornada shell D4_v2 após login', async ({page}) => {
      const shell = new ShellD4PortalPage(page);
      const cToken = tokenPortalOk();

      await mockarDetalheOsCliente(page, detalheOsMinimoE2E(cToken));
      await mockarSairPortal(page);
      await loginTelefonePortalAguardar(page, cToken);

      await shell.expectShellVisivel();
      await expect(shell.navOrdemServico()).toHaveAttribute('aria-current', 'page');

      await shell.irParaBoleto();
      await shell.voltarOrdemServico();
      await expect(shell.layoutAutenticado()).toBeVisible();

      await shell.acionarSair();
      await expectPaginaAcessoPublicaPosSair(page);
   });

   test('CT-E2E-02 — Tema e contraste do botão Sair', async ({page}) => {
      const shell = new ShellD4PortalPage(page);

      await loginOsD4v2CompletoAguardar(page);

      await expect(shell.temaAplicar()).toBeVisible();
      const cPrimary = await shell.temaAplicar().evaluate((oEl) =>
         getComputedStyle(oEl).getPropertyValue('--theme-action-primary'),
      );
      expect(cPrimary.trim()).toBe('#009FFD');

      await expect(shell.btnSair()).toBeVisible();
      await expectContrasteBotaoSairMinimo(page);
   });

   test('CT-E2E-03 — Bloquear área autenticada após Sair', async ({page, context}) => {
      const shell = new ShellD4PortalPage(page);
      const cToken = tokenPortalOk();

      await mockarDetalheOsCliente(page, detalheOsMinimoE2E(cToken));
      await mockarSairPortal(page);
      await loginTelefonePortalAguardar(page, cToken);
      await shell.acionarSair();
      await expectPaginaAcessoPublicaPosSair(page);

      await context.clearCookies();
      await page.unroute('**/api/bff/cliente/os/**');
      await page.goto(`/os/${encodeURIComponent(cToken)}`);

      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toHaveCount(0);
      await expect(
         page.getByText(
            /Sessão não autenticada|Não foi possível (carregar|concluir)/i,
         ),
      ).toBeVisible({timeout: 15_000});

      await page.goto(`/${encodeURIComponent(cToken)}`);
      await expect(shell.formularioAcesso()).toBeVisible({timeout: 15_000});
      await expect(shell.layoutAutenticado()).toHaveCount(0);
   });
});
