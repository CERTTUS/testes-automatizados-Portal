import {expect, type Page} from '@playwright/test';
import {detalheOsMinimoE2E, type RespostaDetalheOsMock} from './mockDetalheOsMinimo';
import {
   C_DADOS_CLIENTE_MASCARADO,
   C_HISTORICO_LISTA,
   lHomologPortal,
   telefonePortal2881,
   tokenPortal2881,
} from './massaPortal2881';
import {
   landingHidratadaAguardar,
   mockarAcessoTelefoneOk,
   mockarDetalheOsCliente,
} from './shellD4Helpers';

export function detalheOsComFlagHistorico(
   cOsPublicId = tokenPortal2881(),
   lHistorico = true,
): RespostaDetalheOsMock {
   const oBase = detalheOsMinimoE2E(cOsPublicId);
   return {
      ...oBase,
      oDados: {
         oOrdemServico: {
            ...oBase.oDados.oOrdemServico,
            oFlagsPainel: {
               evolucao: true,
               condicoes: true,
               historico: lHistorico,
            },
         },
      },
   };
}

export async function mockarDadosCliente(
   page: Page,
   oDados = C_DADOS_CLIENTE_MASCARADO,
): Promise<void> {
   await page.route('**/api/bff/cliente/dados', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
            lSucesso: true,
            cMensagem: 'OK',
            oDados,
         }),
      });
   });
}

export async function mockarHistoricoCliente(
   page: Page,
   oHistorico: {
      nPeriodoDias: number;
      mFases: string[];
      mOrdens: Array<Record<string, string | undefined>>;
   } = C_HISTORICO_LISTA,
): Promise<void> {
   await page.route('**/api/bff/cliente/historico', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
            lSucesso: true,
            cMensagem: 'OK',
            oDados: oHistorico,
         }),
      });
   });
}

export async function interceptarHistoricoErro(page: Page, nStatus = 500): Promise<void> {
   await page.route('**/api/bff/cliente/historico', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: nStatus,
         contentType: 'application/json',
         body: JSON.stringify({lSucesso: false, cMensagem: 'erro'}),
      });
   });
}

export async function interceptarSairErro(page: Page): Promise<void> {
   await page.route('**/api/bff/cliente/sair', async (route) => {
      if (route.request().method() !== 'POST') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 500,
         contentType: 'application/json',
         body: JSON.stringify({lSucesso: false, cMensagem: 'erro'}),
      });
   });
}

export async function forcarHistoricoNoDetalheHomolog(
   page: Page,
   lHistorico = true,
): Promise<void> {
   await page.route('**/api/bff/cliente/os/**', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      const oResposta = await route.fetch();
      const oJson = (await oResposta.json()) as {
         oDados?: {oOrdemServico?: {oFlagsPainel?: Record<string, boolean>}};
      };
      const oOs = oJson.oDados?.oOrdemServico;
      if (oOs) {
         oOs.oFlagsPainel = {
            ...(oOs.oFlagsPainel ?? {}),
            historico: lHistorico,
         };
      }
      await route.fulfill({
         status: oResposta.status(),
         contentType: 'application/json',
         body: JSON.stringify(oJson),
      });
   });
}

export async function hrefsIconeDocumento(page: Page): Promise<string[]> {
   return page.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel*="icon" i]')).map((oEl) => {
         const oLink = oEl as HTMLLinkElement;
         return oLink.href;
      }),
   );
}

export async function expectSemFaviconIco(page: Page): Promise<void> {
   const mHrefs = await hrefsIconeDocumento(page);
   expect(
      mHrefs.some((cHref) => /favicon\.ico(\?|$)/i.test(cHref)),
      `ícones da aba não devem usar favicon.ico; obtidos: ${mHrefs.join(', ')}`,
   ).toBe(false);
   const cHtml = await page.content();
   expect(cHtml, 'HTML não deve referenciar /favicon.ico').not.toMatch(/\/favicon\.ico/i);
}

export async function loginPortal2881(
   page: Page,
   oOpcoes: {lHistorico?: boolean} = {},
): Promise<void> {
   const lHistorico = oOpcoes.lHistorico ?? false;
   const cToken = tokenPortal2881();

   if (lHomologPortal()) {
      if (lHistorico) {
         await forcarHistoricoNoDetalheHomolog(page, true);
      }
      await page.goto(`/${cToken}`);
      await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
         'data-hidratado',
         'true',
         {timeout: 20_000},
      );
      const cTel = telefonePortal2881().replace(/^\+/, '');
      const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
      await page.locator('input[name="telefone"]').fill(cDigitosUi);
      await page.getByTestId('acesso-btn-acessar').click();
      await expect(page).toHaveURL(new RegExp(`/os/`), {timeout: 20_000});
      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
      return;
   }

   await mockarAcessoTelefoneOk(page);
   await mockarDetalheOsCliente(page, detalheOsComFlagHistorico(cToken, lHistorico));
   await mockarDadosCliente(page);
   await mockarHistoricoCliente(page);
   await landingHidratadaAguardar(page, cToken, 'Oficina E2E');

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
   );
   const cTel = telefonePortal2881().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();
   expect((await oRespostaPromise).status()).toBe(200);
   await expect(page).toHaveURL(new RegExp(`/os/${cToken}`), {timeout: 15_000});
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
}

export async function enviarRascunhoPreview(
   page: Page,
   oConfig: Record<string, unknown>,
): Promise<void> {
   await page.goto('/preview/os');
   await page.waitForLoadState('domcontentloaded');
   await expect(page).toHaveURL(/\/preview\/os/);
   await page.evaluate((oPayload) => {
      window.postMessage(
         {tipo: 'portal-preview-rascunho', oConfig: oPayload},
         '*',
      );
   }, oConfig);
}
