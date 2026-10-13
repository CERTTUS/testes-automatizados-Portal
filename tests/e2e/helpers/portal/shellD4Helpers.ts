import {expect, type Page} from '@playwright/test';
import {
   detalheOsD4v2Mock,
   detalheOsMinimoE2E,
   type RespostaDetalheOsMock,
} from './mockDetalheOsMinimo';
import {C_TOKEN_OS_D4_V2, telefoneAutorizado, tokenPortalOk} from '../portalFixtures';

export async function mockarDetalheOsCliente(
   page: Page,
   oCorpo: RespostaDetalheOsMock = detalheOsMinimoE2E(),
): Promise<void> {
   await page.route('**/api/bff/cliente/os/**', async (route) => {
      if (route.request().method() !== 'GET') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify(oCorpo),
      });
   });
}

export async function mockarAcessoTelefoneOk(page: Page): Promise<void> {
   await page.route('**/api/bff/acesso/telefone', async (route) => {
      if (route.request().method() !== 'POST') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
            lSucesso: true,
            cMensagem: 'OK',
            oDados: {cOsPublicId: tokenPortalOk()},
         }),
      });
   });
}

export async function mockarSairPortal(page: Page): Promise<void> {
   await page.route('**/api/bff/cliente/sair', async (route) => {
      if (route.request().method() !== 'POST') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         headers: {
            'Set-Cookie': 'portal_sessao=; Path=/; Max-Age=0',
         },
         body: JSON.stringify({lSucesso: true, cMensagem: 'OK', oDados: {}}),
      });
   });
}

/** Pós-Sair o produto redireciona para `/acesso` (stub legado, sem formulário). */
export async function expectPaginaAcessoPublicaPosSair(page: Page): Promise<void> {
   await expect(page).toHaveURL(/\/acesso\/?$/, {timeout: 15_000});
   await expect(page.getByTestId('layout-portal-autenticado')).toHaveCount(0);
   await expect(
      page.getByRole('heading', {name: 'Portal do Cliente', level: 1}),
   ).toBeVisible();
}

export async function landingHidratadaAguardar(
   page: Page,
   cToken: string,
   cNomeMarca: string,
): Promise<void> {
   await page.goto(`/${cToken}`);
   const oCabecalho = page.getByTestId('acesso-cabecalho-marca');
   await expect(oCabecalho.getByRole('heading', {level: 1})).toHaveText(cNomeMarca, {
      timeout: 15_000,
   });
   await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
      'data-hidratado',
      'true',
   );
}

export async function loginTelefonePortalAguardar(
   page: Page,
   cToken = tokenPortalOk(),
   cNomeMarca = 'Oficina E2E',
): Promise<void> {
   await mockarAcessoTelefoneOk(page);
   await landingHidratadaAguardar(page, cToken, cNomeMarca);

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
   );

   const cTel = telefoneAutorizado().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();

   const oResposta = await oRespostaPromise;
   expect(oResposta.status()).toBe(200);

   await expect(page).toHaveURL(new RegExp(`/os/${cToken}`), {timeout: 15_000});
}

function dominioCookiePortal(): string {
   const cBase = process.env.E2E_BASE_URL || 'http://localhost:3000';
   const cHost = new URL(cBase).hostname;
   return cHost === '127.0.0.1' ? '127.0.0.1' : cHost;
}

export async function abrirOsComSessaoCookie(
   page: Page,
   context: {addCookies: (cookies: Array<Record<string, string>>) => Promise<void>},
   cToken = tokenPortalOk(),
   oDetalhe = detalheOsMinimoE2E(cToken),
): Promise<void> {
   await context.addCookies([
      {
         name: 'portal_sessao',
         value: 'e2e-sessao',
         domain: dominioCookiePortal(),
         path: '/',
      },
   ]);
   await mockarDetalheOsCliente(page, oDetalhe);
   await page.goto(`/os/${encodeURIComponent(cToken)}`);
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
}

export async function loginOsD4v2CompletoAguardar(page: Page): Promise<void> {
   await mockarAcessoTelefoneOk(page);
   await page.route('**/api/bff/acesso/telefone', async (route) => {
      if (route.request().method() !== 'POST') {
         await route.continue();
         return;
      }
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
            lSucesso: true,
            cMensagem: 'OK',
            oDados: {cOsPublicId: C_TOKEN_OS_D4_V2},
         }),
      });
   });
   await mockarDetalheOsCliente(page, detalheOsD4v2Mock());
   await landingHidratadaAguardar(page, C_TOKEN_OS_D4_V2, 'Oficina Certtus');

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
   );

   const cTel = telefoneAutorizado().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();

   const oResposta = await oRespostaPromise;
   expect(oResposta.status()).toBe(200);

   await expect(page).toHaveURL(new RegExp(`/os/${C_TOKEN_OS_D4_V2}`), {
      timeout: 15_000,
   });
}

function luminanciaRelativa(nCanal: number): number {
   const n = nCanal / 255;
   return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function contrasteWcag(cCor1: string, cCor2: string): number {
   const parse = (c: string) => {
      const hex = c.trim().replace('#', '');
      const n = parseInt(hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex, 16);
      return {
         r: (n >> 16) & 255,
         g: (n >> 8) & 255,
         b: n & 255,
      };
   };
   const a = parse(cCor1);
   const b = parse(cCor2);
   const l1 =
      0.2126 * luminanciaRelativa(a.r) +
      0.7152 * luminanciaRelativa(a.g) +
      0.0722 * luminanciaRelativa(a.b);
   const l2 =
      0.2126 * luminanciaRelativa(b.r) +
      0.7152 * luminanciaRelativa(b.g) +
      0.0722 * luminanciaRelativa(b.b);
   const claro = Math.max(l1, l2);
   const escuro = Math.min(l1, l2);
   return (claro + 0.05) / (escuro + 0.05);
}

export async function expectContrasteBotaoSairMinimo(
   page: Page,
   nMinimo = 4.5,
): Promise<void> {
   const oCores = await page.getByTestId('btn-sair-portal').evaluate((el) => {
      const oEstilo = getComputedStyle(el);
      return {
         cTexto: oEstilo.color,
         cFundo: oEstilo.backgroundColor,
      };
   });

   const rgbParaHex = (cRgb: string): string => {
      const m = cRgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) {
         return cRgb;
      }
      const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
      return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
   };

   const cTexto = rgbParaHex(oCores.cTexto);
   const cFundo = rgbParaHex(oCores.cFundo);
   const nRatio = contrasteWcag(cTexto, cFundo);
   expect(
      nRatio,
      `Contraste botão Sair (${cTexto} sobre ${cFundo}) = ${nRatio.toFixed(2)}; mínimo ${nMinimo}`,
   ).toBeGreaterThanOrEqual(nMinimo);
}
