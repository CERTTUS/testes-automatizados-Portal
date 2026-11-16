import {expect, type Locator, type Page} from '@playwright/test';
import {telefoneAutorizado} from '../portalFixtures';
import {landingD1ProntaAguardar, landingD1TemaCustomAguardar} from './landingD1Helpers';

export function telefoneDigitosUi(): string {
   const cTel = telefoneAutorizado().replace(/^\+/, '');
   return cTel.startsWith('55') ? cTel.slice(2) : cTel;
}

export function locatorCaixaTelefone(page: Page): Locator {
   return page.getByTestId('acesso-form-login').locator('.ds-cf-root .ds-cf-box');
}

export function lCorPareceAutofillAmarelo(cRgb: string): boolean {
   const m = cRgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
   if (!m) {
      return false;
   }
   const nR = Number(m[1]);
   const nG = Number(m[2]);
   const nB = Number(m[3]);
   return nR >= 240 && nG >= 220 && nB <= 210;
}

export function lFundoEscuro(cRgb: string): boolean {
   const m = cRgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
   if (!m) {
      return false;
   }
   const nMedia = (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
   return nMedia < 128;
}

export async function assertCaixaTelefoneSemFundoAmarelo(page: Page): Promise<void> {
   const oCaixa = locatorCaixaTelefone(page);
   const cCor = await oCaixa.evaluate((el) => window.getComputedStyle(el).backgroundColor);
   expect(lCorPareceAutofillAmarelo(cCor), `fundo parece autofill amarelo: ${cCor}`).toBe(false);
}

export async function assertCaixaTelefoneFundoEscuro(page: Page): Promise<void> {
   const oCaixa = locatorCaixaTelefone(page);
   const cCor = await oCaixa.evaluate((el) => window.getComputedStyle(el).backgroundColor);
   expect(lFundoEscuro(cCor), `fundo deveria ser escuro, obteve ${cCor}`).toBe(true);
}

export async function interagirCampoTelefoneBlur(page: Page): Promise<void> {
   const oInput = page.locator('input[name="telefone"]');
   await oInput.click();
   await oInput.fill(telefoneDigitosUi());
   await page.getByTestId('acesso-assinatura-certtus').click({force: true});
   await assertCaixaTelefoneSemFundoAmarelo(page);
}

export async function landingLoginClaroPronta(page: Page): Promise<void> {
   await landingD1ProntaAguardar(page);
   await expect(page.getByTestId('acesso-form-login')).toBeVisible();
}

export async function landingLoginEscuroPronta(page: Page): Promise<void> {
   await landingD1TemaCustomAguardar(page);
   await expect(page.getByTestId('acesso-form-login')).toBeVisible();
}