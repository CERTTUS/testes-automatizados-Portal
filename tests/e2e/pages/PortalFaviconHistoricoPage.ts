import {expect, type Locator, type Page} from '@playwright/test';

export class PortalFaviconHistoricoPage {
   constructor(private readonly page: Page) {}

   layoutAutenticado(): Locator {
      return this.page.getByTestId('layout-portal-autenticado');
   }

   menuTopo(): Locator {
      return this.page.getByTestId('menu-topo-portal');
   }

   navOrdemServico(): Locator {
      return this.page.getByTestId('nav-ordem-servico');
   }

   navHistorico(): Locator {
      return this.page.getByTestId('nav-historico');
   }

   navBoleto(): Locator {
      return this.page.getByTestId('nav-boleto');
   }

   btnMenuConta(): Locator {
      return this.page.getByTestId('btn-menu-conta');
   }

   painelMenuConta(): Locator {
      return this.page.getByTestId('menu-conta-painel');
   }

   btnMeusDados(): Locator {
      return this.page.getByTestId('btn-meus-dados');
   }

   menuHistorico(): Locator {
      return this.page.getByTestId('menu-historico');
   }

   btnSair(): Locator {
      return this.page.getByTestId('btn-sair-portal');
   }

   painelMeusDados(): Locator {
      return this.page.getByTestId('painel-meus-dados');
   }

   /* Os três locators abaixo caem no papel/texto dentro do contêiner quando o data-testid
      ainda não foi publicado no ambiente (portalcliente-web sem o commit dos testids). */
   documentoMeusDados(): Locator {
      return this.page.getByTestId('meus-dados-documento').or(
         this.painelMeusDados()
            .locator('.portal-meus-dados__campo')
            .filter({has: this.page.locator('dt', {hasText: /^(CPF|CNPJ|Documento)$/})})
            .locator('dd'),
      );
   }

   secaoHistorico(): Locator {
      return this.page.getByTestId('secao-historico-os');
   }

   itemHistorico(): Locator {
      return this.page.getByTestId('item-historico-os');
   }

   seloOsAtual(): Locator {
      return this.page.getByTestId('selo-os-atual');
   }

   historicoVazio(): Locator {
      return this.page.getByTestId('historico-vazio').or(
         this.secaoHistorico().getByText(/^Nenhuma ordem de serviço nos últimos \d+ dias$/),
      );
   }

   alertaHistoricoIndisponivel(): Locator {
      return this.page.getByTestId('alerta-historico-indisponivel').or(
         this.secaoHistorico().getByRole('alert'),
      );
   }

   alertaErroSair(): Locator {
      return this.page.getByTestId('alerta-erro-sair');
   }

   previewOsFalsa(): Locator {
      return this.page.getByTestId('preview-os-falsa');
   }

   async abrirMenuConta(): Promise<void> {
      await this.btnMenuConta().click();
      await expect(this.painelMenuConta()).toBeVisible();
   }

   async abrirMeusDados(): Promise<void> {
      await this.abrirMenuConta();
      await this.btnMeusDados().click();
      await expect(this.painelMeusDados()).toBeVisible();
   }

   async abrirAbaHistorico(): Promise<void> {
      await this.navHistorico().click();
      await expect(this.secaoHistorico()).toBeVisible();
   }

   async acionarSair(): Promise<void> {
      const lPainelAberto = await this.painelMenuConta().isVisible().catch(() => false);
      if (!lPainelAberto) {
         await this.abrirMenuConta();
      }
      await this.btnSair().click();
   }
}
