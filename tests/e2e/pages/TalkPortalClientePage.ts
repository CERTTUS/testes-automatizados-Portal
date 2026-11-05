import {expect, type Locator, type Page} from '@playwright/test';
import {TALK_BASE_URL} from '../helpers/env';
import {cCaminhoFixtureImagem, cEmailTalk, cSenhaTalk} from '../helpers/portal/massaPortal2881';

export class TalkPortalClientePage {
   constructor(private readonly page: Page) {}

   pagina(): Locator {
      return this.page.getByTestId('portal-cliente-pagina');
   }

   abaAparenciaTab(): Locator {
      return this.page.getByTestId('portal-cliente-aba-aparencia-tab');
   }

   abaAparencia(): Locator {
      return this.page.getByTestId('portal-cliente-aba-aparencia');
   }

   abaConteudoTab(): Locator {
      return this.page.getByTestId('portal-cliente-aba-conteudo-tab');
   }

   historicoExibir(): Locator {
      return this.page.getByTestId('portal-cliente-historico-exibir');
   }

   inputFavicon(): Locator {
      return this.page.locator('#portal-cliente-favicon-input');
   }

   inputLogo(): Locator {
      return this.page.locator('#portal-cliente-logo-input');
   }

   faviconPadrao(): Locator {
      return this.page.getByTestId('portal-cliente-favicon-padrao');
   }

   btnEnviarFavicon(): Locator {
      return this.page.getByRole('button', {name: /Enviar Favicon/i});
   }

   btnEnviarLogo(): Locator {
      return this.page.getByRole('button', {name: /Enviar Logo/i});
   }

   cropperTitulo(): Locator {
      return this.page.locator('#dialog-cropper-title');
   }

   btnCropperAplicar(): Locator {
      return this.page.getByTestId('image-cropper-aplicar').or(
         this.page.getByRole('button', {name: 'Aplicar'}),
      );
   }

   btnCropperCancelar(): Locator {
      return this.page.getByTestId('image-cropper-cancelar').or(
         this.page.getByRole('button', {name: 'Cancelar'}),
      );
   }

   btnGravar(): Locator {
      return this.page.getByTestId('portal-cliente-gravar');
   }

   preview(): Locator {
      return this.page.getByTestId('portal-cliente-preview');
   }

   async autenticarSeNecessario(): Promise<void> {
      await this.page.goto(`${TALK_BASE_URL}/portal-cliente`);
      const oEmail = this.page.locator('#email');
      const lLoginVisivel = await oEmail
         .waitFor({state: 'visible', timeout: 5_000})
         .then(() => true)
         .catch(() => false);
      if (lLoginVisivel) {
         const cEmail = cEmailTalk();
         const cSenha = cSenhaTalk();
         expect(cEmail, 'TALK_EMAIL precisa estar no .env.local').not.toBe('');
         expect(cSenha, 'TALK_PASSWORD precisa estar no .env.local').not.toBe('');
         await oEmail.fill(cEmail);
         await this.page.locator('#password').fill(cSenha);
         await this.page.getByRole('button', {name: 'Acessar'}).click();
         // Depois do login o Talk abre Conversas, não a rota pedida: volta ao Portal do Cliente.
         await expect(oEmail).toHaveCount(0, {timeout: 30_000});
         await this.page.goto(`${TALK_BASE_URL}/portal-cliente`);
      }
      await expect(this.pagina()).toBeVisible({timeout: 30_000});
   }

   async abrirAparencia(): Promise<void> {
      await this.abaAparenciaTab().click();
      await expect(this.abaAparencia()).toBeVisible();
   }

   async abrirConteudo(): Promise<void> {
      await this.abaConteudoTab().click();
      await expect(this.page.getByTestId('portal-cliente-aba-conteudo')).toBeVisible();
   }

   async enviarImagemERecortar(
      oInput: Locator,
      cArquivo: string,
      cTituloCropper: string,
   ): Promise<void> {
      await oInput.setInputFiles(cCaminhoFixtureImagem(cArquivo));
      await expect(this.cropperTitulo()).toHaveText(cTituloCropper, {timeout: 15_000});
      await this.btnCropperAplicar().click();
      await expect(this.cropperTitulo()).toHaveCount(0);
   }

   async gravarConfiguracao(): Promise<void> {
      await expect(this.btnGravar()).toBeEnabled();
      const oRespostaPromise = this.page.waitForResponse(
         (oRes) =>
            oRes.url().includes('/portal-cliente/config/') &&
            ['POST', 'PUT', 'PATCH'].includes(oRes.request().method()),
      );
      await this.btnGravar().click();
      const oResposta = await oRespostaPromise;
      expect(
         oResposta.ok(),
         `Gravar deve persistir (HTTP ${oResposta.status()} em ${oResposta.url()})`,
      ).toBe(true);
   }
}
