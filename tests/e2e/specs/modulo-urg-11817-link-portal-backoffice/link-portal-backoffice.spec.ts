import {expect, request as oPlaywrightRequest, type APIRequestContext} from '@playwright/test';
import {test} from '../../fixtures';
import {bancoFechar, osMassaCarregar} from '../../helpers/portal/backofficeLinkBanco';
import {
   C_TELEFONE_A,
   C_TELEFONE_B,
   lChaveConfigurada,
   linkEmitir,
   linkRevogar,
} from '../../helpers/portal/backofficeLinkMs';
import {C_WEB_URL} from '../../helpers/portal/portalBffAcesso';

/**
 * Bloco 4 — E2E do Portal web (127.0.0.1:3000) sobre um link emitido pelo BackOffice (via MS).
 * Preparação própria: revoga e emite na OS de massa. Serial: mexe sempre na mesma OS.
 */
test.describe.configure({mode: 'serial'});

const C_DIGITOS_A = C_TELEFONE_A.slice(2); // 46991178665
const C_DIGITOS_B = C_TELEFONE_B.slice(2); // 46991064223

test.describe('Portal web — link emitido pelo BackOffice (URG-11817)', () => {
   test.skip(!lChaveConfigurada(), 'PORTAL_BO_MS_CHAVEAPI não configurada no .env.local');

   let oReq: APIRequestContext;
   let cOs = '';
   let cToken = '';

   async function telefoneInformar(oPage: import('@playwright/test').Page, cDigitos: string): Promise<void> {
      await oPage.goto(`${C_WEB_URL}/${cToken}`);
      const oForm = oPage.getByTestId('acesso-form-login');
      await expect(oForm).toBeVisible();
      await expect(oForm).toHaveAttribute('data-hidratado', 'true');
      const oCampo = oPage.getByRole('textbox', {name: 'Telefone'});
      await oCampo.click();
      await oCampo.pressSequentially(cDigitos);
      await oPage.getByTestId('acesso-btn-acessar').click();
   }

   test.beforeAll(async () => {
      oReq = await oPlaywrightRequest.newContext();
      cOs = await osMassaCarregar();
      expect(cOs, 'OS de massa não encontrada no banco').not.toBe('');
      const oRev = await linkRevogar(oReq, {cOrdemServico: cOs});
      expect([200, 404], oRev.cTexto).toContain(oRev.nStatus);
      const oEmi = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A});
      expect(oEmi.nStatus, oEmi.cTexto).toBe(200);
      cToken = oEmi.oBody.oDados.cToken;
   });

   test.afterAll(async () => {
      if (oReq && cOs) {
         await linkRevogar(oReq, {cOrdemServico: cOs}).catch(() => undefined);
      }
      await oReq?.dispose();
      await bancoFechar();
   });

   test('CT-E2E-01 — Link válido + celular certo', async ({page}) => {
      await telefoneInformar(page, C_DIGITOS_A);
      await expect(page).toHaveURL(`${C_WEB_URL}/os/${cToken}`);
      await expect(page.getByText(cOs).first()).toBeVisible();
   });

   test('CT-E2E-02 — Celular errado', async ({page}) => {
      await telefoneInformar(page, '46999999999');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page).toHaveURL(`${C_WEB_URL}/${cToken}`);
      await expect(page.getByTestId('acesso-form-login')).toBeVisible();
   });

   test('CT-E2E-04 — Celular trocado', async ({page, browser}) => {
      const oEmi = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_B});
      expect(oEmi.nStatus, oEmi.cTexto).toBe(200);
      expect(oEmi.oBody.oDados.lHashAtualizado).toBe(true);

      // Telefone antigo recusado.
      await telefoneInformar(page, C_DIGITOS_A);
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page).toHaveURL(`${C_WEB_URL}/${cToken}`);

      // Telefone novo entra (contexto novo: sem sessão anterior).
      const oContexto = await browser.newContext();
      const oPagina = await oContexto.newPage();
      await telefoneInformar(oPagina, C_DIGITOS_B);
      await expect(oPagina).toHaveURL(`${C_WEB_URL}/os/${cToken}`);
      await expect(oPagina.getByText(cOs).first()).toBeVisible();
      await oContexto.close();
   });

   test('CT-E2E-03 — Link revogado', async ({page}) => {
      const oRev = await linkRevogar(oReq, {cOrdemServico: cOs});
      expect(oRev.nStatus, oRev.cTexto).toBe(200);
      await page.goto(`${C_WEB_URL}/${cToken}`);
      await expect(page.getByTestId('portal-link-indisponivel')).toBeVisible();
   });
});
