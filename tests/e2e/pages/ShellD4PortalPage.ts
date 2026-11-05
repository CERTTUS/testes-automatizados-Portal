import {expect, type Page} from '@playwright/test';

export class ShellD4PortalPage {
   constructor(private readonly page: Page) {}

   layoutAutenticado() {
      return this.page.getByTestId('layout-portal-autenticado');
   }

   menuTopo() {
      return this.page.getByTestId('menu-topo-portal');
   }

   navOrdemServico() {
      return this.page.getByTestId('nav-ordem-servico');
   }

   navBoleto() {
      return this.page.getByTestId('nav-boleto');
   }

   btnSair() {
      return this.page.getByTestId('btn-sair-portal');
   }

   secaoBoletoEmBreve() {
      return this.page.getByTestId('secao-boleto-em-breve');
   }

   temaAplicar() {
      return this.page.getByTestId('tema-portal-aplicar');
   }

   formularioAcesso() {
      return this.page.getByTestId('acesso-form-login');
   }

   async expectShellVisivel(): Promise<void> {
      await expect(this.layoutAutenticado()).toBeVisible();
      await expect(this.menuTopo()).toBeVisible();
   }

   /** O Portal não tem menu Boleto (decisão de produto): nem o item no topo, nem a seção "Em breve". */
   async expectSemBoleto(): Promise<void> {
      await expect(this.navBoleto()).toHaveCount(0);
      await expect(this.secaoBoletoEmBreve()).toHaveCount(0);
   }

   async voltarOrdemServico(): Promise<void> {
      await this.navOrdemServico().click();
      await expect(this.navOrdemServico()).toHaveAttribute('aria-current', 'page');
   }

   async acionarSair(): Promise<void> {
      const oSairPromise = this.page.waitForResponse(
         (oRes) =>
            oRes.url().includes('/api/bff/cliente/sair') &&
            oRes.request().method() === 'POST',
      );
      await this.btnSair().click();
      const oResposta = await oSairPromise;
      expect(oResposta.status()).toBe(200);
      await expect(this.page).toHaveURL(/\/acesso/, {timeout: 15_000});
   }
}
