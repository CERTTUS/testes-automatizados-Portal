import {expect, test} from '../../fixtures';
import {
   C_HISTORICO_LISTA,
   C_HISTORICO_VAZIO,
   tokenPortal2881,
   tokenPortalSemFavicon,
   urlFaviconExistente,
} from '../../helpers/portal/massaPortal2881';
import {
   expectSemFaviconIco,
   hrefsIconeDocumento,
   interceptarHistoricoErro,
   interceptarSairErro,
   loginPortal2881,
   mockarHistoricoCliente,
   enviarRascunhoPreview,
} from '../../helpers/portal/portal2881Helpers';
import {PortalFaviconHistoricoPage} from '../../pages/PortalFaviconHistoricoPage';

test.describe('E2E — Portal favicon, histórico e menu (TALK-2881)', () => {
   test('CT-E2E-01 — Ícone da oficina na aba do navegador', async ({page}) => {
      const cToken = tokenPortal2881();
      await page.goto(`/${cToken}`);
      await expect(page.getByTestId('acesso-form-login')).toBeVisible({timeout: 20_000});
      const mHrefs = await hrefsIconeDocumento(page);
      expect(mHrefs.length, 'documento deve expor links de ícone').toBeGreaterThan(0);
      await expectSemFaviconIco(page);
   });

   test('CT-E2E-02 — Menu da conta exibe Meus dados mascarado, Histórico e Sair', async ({
      page,
   }) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await loginPortal2881(page, {lHistorico: true});
      await portal.abrirMeusDados();
      await expect(portal.documentoMeusDados()).toBeVisible();
      await expect(portal.documentoMeusDados()).toHaveText(/\*/);
      await page.keyboard.press('Escape');
      await portal.abrirMenuConta();
      await expect(portal.menuHistorico()).toBeVisible();
      await expect(portal.btnSair()).toBeVisible();
   });

   test('CT-E2E-03 — Menu da conta navega por teclado', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await loginPortal2881(page);
      await portal.btnMenuConta().focus();
      await page.keyboard.press('ArrowDown');
      await expect(portal.painelMenuConta()).toBeVisible();
      await expect(portal.btnMeusDados()).toBeFocused();
      await page.keyboard.press('End');
      await expect(portal.btnSair()).toBeFocused();
      await page.keyboard.press('Home');
      await expect(portal.btnMeusDados()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(portal.painelMenuConta()).toHaveCount(0);
      await portal.abrirMenuConta();
      await page.keyboard.press('Tab');
      await expect(portal.painelMenuConta()).toHaveCount(0);
   });

   test('CT-E2E-04 — Aba Histórico lista OS, abre detalhe e marca a OS atual', async ({
      page,
   }) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await mockarHistoricoCliente(page, {
         ...C_HISTORICO_LISTA,
         mOrdens: C_HISTORICO_LISTA.mOrdens.map((oItem, nIndice) =>
            nIndice === 0
               ? {...oItem, cOsPublicId: tokenPortal2881()}
               : oItem,
         ),
      });
      await loginPortal2881(page, {lHistorico: true});
      await portal.abrirAbaHistorico();
      await expect(portal.itemHistorico().first()).toBeVisible();
      await expect(portal.seloOsAtual()).toBeVisible();
      const cHref = await portal.itemHistorico().nth(1).getAttribute('href');
      expect(cHref).toBeTruthy();
      await portal.itemHistorico().nth(1).click();
      await expect(page).toHaveURL(/\/os\//);
   });

   test('CT-E2E-05 — Sair encerra a sessão e redireciona', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await loginPortal2881(page);
      await portal.acionarSair();
      await expect(portal.layoutAutenticado()).toHaveCount(0, {timeout: 15_000});
      await expect(page).not.toHaveURL(/\/os\//);
   });

   test('CT-E2E-06 — Shell autenticado não exibe Boleto', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await loginPortal2881(page);
      await expect(portal.menuTopo()).toBeVisible();
      await expect(portal.navOrdemServico()).toBeVisible();
      await expect(portal.navBoleto()).toHaveCount(0);
      await expect(page.getByTestId('secao-boleto-em-breve')).toHaveCount(0);
   });

   test('CT-E2E-07 — Preview do Portal aplica rascunho por mensagem da janela', async ({
      page,
   }) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await enviarRascunhoPreview(page, {
         nomeEmpresa: 'Oficina Preview',
         faviconUrl: urlFaviconExistente(),
         historicoConfig: {lExibir: true, nPeriodoDias: 180, mFases: ['E']},
      });
      await expect(portal.previewOsFalsa()).toBeVisible({timeout: 15_000});
      await expect(portal.navHistorico()).toBeVisible();
      expect(page.url()).not.toMatch(/8081|talk/i);
   });

   test('CT-E2E-09 — Ícone da aba cai na marca CERTTUS sem favicon da oficina', async ({
      page,
   }) => {
      await page.goto(`/${tokenPortalSemFavicon()}`);
      await expect(page.locator('body')).toBeVisible();
      const mHrefs = await hrefsIconeDocumento(page);
      expect(
         mHrefs.some((cHref) => /certtus-marca/i.test(cHref)),
         `ícone deve cair na marca CERTTUS; obtidos: ${mHrefs.join(', ')}`,
      ).toBe(true);
      await expectSemFaviconIco(page);
   });

   test('CT-E2E-10 — Histórico desligado some da navegação e do menu', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await loginPortal2881(page, {lHistorico: false});
      await expect(portal.navHistorico()).toHaveCount(0);
      await portal.abrirMenuConta();
      await expect(portal.menuHistorico()).toHaveCount(0);
      await expect(portal.btnSair()).toBeVisible();
   });

   test('CT-E2E-11 — Histórico vazio exibe mensagem de nenhuma ordem', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await mockarHistoricoCliente(page, C_HISTORICO_VAZIO);
      await loginPortal2881(page, {lHistorico: true});
      await portal.abrirAbaHistorico();
      await expect(portal.historicoVazio()).toBeVisible();
      await expect(portal.historicoVazio()).toContainText(
         /Nenhuma ordem de serviço nos últimos \d+ dias/,
      );
   });

   test('CT-E2E-12 — Falha ao sair exibe alerta de erro', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await interceptarSairErro(page);
      await loginPortal2881(page);
      await portal.acionarSair();
      await expect(portal.alertaErroSair()).toBeVisible();
      await expect(portal.alertaErroSair()).toHaveText(
         'Não foi possível sair. Tente novamente.',
      );
      await expect(portal.layoutAutenticado()).toBeVisible();
   });

   test('CT-E2E-13 — Sair no preview do Portal não encerra a sessão', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await enviarRascunhoPreview(page, {
         nomeEmpresa: 'Oficina Preview',
         historicoConfig: {lExibir: true},
      });
      await expect(portal.layoutAutenticado()).toBeVisible({timeout: 15_000});
      await portal.acionarSair();
      await expect(page).toHaveURL(/\/preview\/os/);
      await expect(portal.layoutAutenticado()).toBeVisible();
      await expect(page.getByTestId('acesso-form-login')).toHaveCount(0);
   });

   test('CT-E2E-14 — Histórico indisponível exibe alerta na seção', async ({page}) => {
      const portal = new PortalFaviconHistoricoPage(page);
      await interceptarHistoricoErro(page, 500);
      await loginPortal2881(page, {lHistorico: true});
      await portal.abrirAbaHistorico();
      await expect(portal.alertaHistoricoIndisponivel()).toBeVisible();
      await expect(portal.alertaHistoricoIndisponivel()).toHaveText('Histórico indisponível');
      await expect(portal.itemHistorico()).toHaveCount(0);
   });
});
