import {expect, type Page} from '@playwright/test';

export class AcessoPortalPage {
   constructor(private readonly page: Page) {}

   async abrirLanding(cToken: string): Promise<void> {
      await this.page.goto(`/${cToken}`);
      await expect(this.page.locator('.acesso-marca__nome')).toHaveText('Oficina E2E');
      await expect(this.page.locator('form.acesso-form')).toHaveAttribute(
         'data-hidratado',
         'true',
      );
   }

   campoTelefone() {
      return this.page.locator('input[name="telefone"]');
   }

   async preencherTelefone(cDigitos: string): Promise<void> {
      await this.campoTelefone().fill(cDigitos);
   }

   async expectValorTelefone(cValor: string): Promise<void> {
      await expect(this.campoTelefone()).toHaveValue(cValor);
   }

   async posicionarCursorTelefone(nPosicao: number): Promise<void> {
      const oCampo = this.campoTelefone();
      await oCampo.focus();
      await oCampo.evaluate((el, nPos) => {
         (el as HTMLInputElement).setSelectionRange(nPos, nPos);
      }, nPosicao);
   }

   async pressionarBackspaceTelefone(): Promise<void> {
      await this.campoTelefone().press('Backspace');
   }

   async clicarAcessar(): Promise<void> {
      await this.page.getByRole('button', {name: 'Acessar'}).click();
   }

   async aguardarPostTelefone() {
      const oReq = this.page.waitForRequest(
         (r) =>
            r.url().includes('/api/bff/acesso/telefone') && r.method() === 'POST',
      );
      const oRes = this.page.waitForResponse(
         (r) =>
            r.url().includes('/api/bff/acesso/telefone') &&
            r.request().method() === 'POST',
      );
      return {oReq, oRes};
   }

   async expectRedirectOs(cToken: string): Promise<void> {
      await expect(this.page).toHaveURL(new RegExp(`/os/${cToken}`), {
         timeout: 15_000,
      });
   }

   async expectAlertaErro(cTexto: string): Promise<void> {
      await expect(this.page.locator('.acesso-alerta-erro')).toContainText(cTexto);
   }

   async expectLinkIndisponivel(): Promise<void> {
      await expect(this.page.getByText('Link indisponível')).toBeVisible();
      await expect(this.page.getByText(/não está mais disponível/i)).toBeVisible();
      await expect(this.page.locator('input[name="telefone"]')).toHaveCount(0);
   }
}
