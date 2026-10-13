import type {BrowserContext, Page} from '@playwright/test';
import {C_TOKEN_OK} from '../portalFixtures';
import type {RespostaDetalheOsMock} from './mockDetalheOsMinimo';
import {mockarDetalheOsCliente} from './shellD4Helpers';

export async function cookieSessaoPortalE2e(context: BrowserContext): Promise<void> {
   await context.addCookies([
      {
         name: 'portal_sessao',
         value: 'e2e-sessao',
         domain: 'localhost',
         path: '/',
      },
   ]);
}

export async function abrirDetalheOsAutenticadoMock(
   page: Page,
   context: BrowserContext,
   oCorpo: RespostaDetalheOsMock,
   cOsPublicId = C_TOKEN_OK,
): Promise<void> {
   await cookieSessaoPortalE2e(context);
   await mockarDetalheOsCliente(page, oCorpo);
   await page.goto(`/os/${encodeURIComponent(cOsPublicId)}`);
}

export async function mockarDetalheOsFalhaHttp(
   page: Page,
   nStatus = 500,
   cCorpo = '{"lSucesso":false,"cMensagem":"Falha simulada no BFF"}',
): Promise<void> {
   await page.route('**/api/bff/cliente/os/**', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: nStatus,
         contentType: 'application/json',
         body: cCorpo,
      });
   });
}
