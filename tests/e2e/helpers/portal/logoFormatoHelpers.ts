import {expect, type Page} from '@playwright/test';
import {
   C_LOGO_URL_HORIZONTAL,
   C_NOME_LOGO_HORIZONTAL,
   C_NOME_SEM_LOGO,
   C_TOKEN_LOGO_HORIZONTAL,
   C_TOKEN_SEM_LOGO,
} from '../../../api/modulo-talk-3105-logo-formato/logoFormatoApi';
import {detalheOsMinimoE2E, type RespostaDetalheOsMock} from './mockDetalheOsMinimo';
import {mockarDetalheOsCliente} from './shellD4Helpers';
import {telefoneAutorizado} from '../portalFixtures';
import {lHomologPortal} from './massaPortal2881';

const C_LOGO_PLACEHOLDER_MARCA = '/marca/certtus-marca.png';
const C_MSG_ERRO_LANDING = 'Não foi possível carregar este link';

const M_NOMES_POR_TOKEN: Record<string, string> = {
   [C_TOKEN_LOGO_HORIZONTAL]: C_NOME_LOGO_HORIZONTAL,
   [C_TOKEN_SEM_LOGO]: C_NOME_SEM_LOGO,
};

const C_NOME_LONGO_HORIZONTAL =
   'Oficina Certtus Extrema Logo Horizontal Ltda Me';

export const C_SELETOR_LOGO_LOGIN = '.acesso-marca__logo';
export const C_SELETOR_LOGO_MENU = '.portal-nav-top__logo:not(.portal-nav-top__esqueleto)';
export const C_SELETOR_LOGO_RODAPE = '.portal-rodape-oficina__logo';

export function nomeFantasiaLogoToken(cToken: string): string {
   return M_NOMES_POR_TOKEN[cToken] ?? 'Oficina';
}

export function detalheOsComBrandingLogo(
   cToken: string,
   cNomeFantasia: string,
   cLogoUrl: string,
): RespostaDetalheOsMock {
   const oBase = detalheOsMinimoE2E(cToken, cNomeFantasia);
   const oOrdem = oBase.oDados.oOrdemServico;
   oOrdem.oBranding = {
      cNomeFantasia,
      cLogoUrl,
      cCnpj: '11058049000111',
      cEndereco: 'Rua QA, 100',
      cTelefone: '5511999999999',
      ...(cToken === C_TOKEN_LOGO_HORIZONTAL
         ? {cNomeExibicaoPortal: C_NOME_LONGO_HORIZONTAL}
         : {}),
   };
   delete oOrdem.oTokensDerivados;
   return oBase;
}

async function mockarAcessoTelefoneParaToken(page: Page, cToken: string): Promise<void> {
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
            oDados: {cOsPublicId: cToken},
         }),
      });
   });
}

export async function landingLogoAguardar(page: Page, cToken: string): Promise<void> {
   const cNome = nomeFantasiaLogoToken(cToken);
   if (lHomologPortal()) {
      await expect
         .poll(
            async () => {
               await page
                  .goto(`/${cToken}`, {waitUntil: 'networkidle', timeout: 60_000})
                  .catch(async () => {
                     await page.goto(`/${cToken}`, {waitUntil: 'domcontentloaded', timeout: 45_000});
                  });
               await page
                  .waitForResponse(
                     (oRes) =>
                        oRes.request().method() === 'GET' &&
                        oRes.url().includes('/api/bff/') &&
                        oRes.url().includes('/portal/') &&
                        oRes.status() === 200,
                     {timeout: 25_000},
                  )
                  .catch(() => undefined);
               if (await page.getByText(C_MSG_ERRO_LANDING).isVisible().catch(() => false)) {
                  await new Promise((r) => setTimeout(r, 8_000));
                  return 'rate_limit';
               }
               const lMarca = await page
                  .getByTestId('acesso-cabecalho-marca')
                  .isVisible()
                  .catch(() => false);
               if (!lMarca) {
                  return 'aguardando';
               }
               const lHidratado = await page
                  .getByTestId('acesso-form-login')
                  .getAttribute('data-hidratado')
                  .catch(() => null);
               return lHidratado === 'true' ? 'ok' : 'aguardando';
            },
            {
               message: `landing homolog token ${cToken} (429/transiente)`,
               timeout: 120_000,
               intervals: [3_000, 5_000, 8_000, 12_000],
            },
         )
         .toBe('ok');
   } else {
      await page.goto(`/${cToken}`);
      await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();
      await expect(page.getByTestId('acesso-form-login')).toHaveAttribute('data-hidratado', 'true');
   }
   const cNomeUi =
      cToken === C_TOKEN_LOGO_HORIZONTAL ? C_NOME_LONGO_HORIZONTAL : cNome;
   await expect(page.locator('.acesso-marca__nome')).toHaveText(cNomeUi);
}

export async function loginPortalLogoDetalhe(
   page: Page,
   cToken: string,
   cLogoUrl: string,
): Promise<void> {
   const cNome = nomeFantasiaLogoToken(cToken);
   if (!lHomologPortal()) {
      await mockarAcessoTelefoneParaToken(page, cToken);
      await mockarDetalheOsCliente(page, detalheOsComBrandingLogo(cToken, cNome, cLogoUrl));
   }
   await landingLogoAguardar(page, cToken);

   const oRespostaPromise = page.waitForResponse(
      (oRes) => oRes.url().includes('/api/bff/acesso/telefone') && oRes.request().method() === 'POST',
   );

   const cTel = telefoneAutorizado().replace(/^\+/, '');
   const cDigitosUi = cTel.startsWith('55') ? cTel.slice(2) : cTel;
   await page.locator('input[name="telefone"]').fill(cDigitosUi);
   await page.getByTestId('acesso-btn-acessar').click();

   expect((await oRespostaPromise).status()).toBe(200);
   await expect(page).toHaveURL(
      new RegExp(`/os/${cToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      {timeout: 15_000},
   );
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible({timeout: 15_000});
   await expect(page.getByTestId('menu-topo-portal')).toBeVisible();
   await expect(page.getByTestId('rodape-oficina-portal')).toBeVisible();
}

export async function srcImagemLogo(page: Page, cSeletor: string): Promise<string> {
   const oImg = page.locator(cSeletor).first();
   await expect(oImg).toBeVisible({timeout: 15_000});
   return (await oImg.getAttribute('src')) ?? '';
}

export async function assertSrcLogoHorizontal(cSrc: string): Promise<void> {
   expect(cSrc.toLowerCase()).toContain('logo-horizontal');
}

export async function assertSrcMarcaPadrao(cSrc: string): Promise<void> {
   const cMarca = C_LOGO_PLACEHOLDER_MARCA.replace(/^\//, '');
   let cAvaliar = decodeURIComponent(cSrc);
   if (cAvaliar.includes('/_next/image?')) {
      const oUrl = new URL(cAvaliar, 'http://localhost');
      const cParam = oUrl.searchParams.get('url');
      if (cParam) {
         cAvaliar = decodeURIComponent(cParam);
      }
   }
   expect(cAvaliar).toContain(cMarca);
   expect(cSrc.toLowerCase()).not.toContain('logo-horizontal');
}

type oFaixaAlturaLogo = {nMin: number; nMax: number; nMaxLargura: number};

function faixasLogoPorViewport(nLarguraVp: number): {menu: oFaixaAlturaLogo; rodape: oFaixaAlturaLogo} {
   if (nLarguraVp <= 767) {
      return {
         menu: {nMin: 44, nMax: 52, nMaxLargura: 165},
         rodape: {nMin: 58, nMax: 68, nMaxLargura: 205},
      };
   }
   return {
      menu: {nMin: 52, nMax: 60, nMaxLargura: 225},
      rodape: {nMin: 68, nMax: 76, nMaxLargura: 245},
   };
}

export async function assertLogoProporcionalHorizontal(
   page: Page,
   cSeletor: string,
   oFaixa: oFaixaAlturaLogo,
): Promise<void> {
   const oBox = await page.locator(cSeletor).first().boundingBox();
   expect(oBox, `bounding box de ${cSeletor}`).not.toBeNull();
   const nH = oBox!.height;
   const nW = oBox!.width;
   expect(nH).toBeGreaterThanOrEqual(oFaixa.nMin);
   expect(nH).toBeLessThanOrEqual(oFaixa.nMax);
   expect(nW).toBeLessThanOrEqual(oFaixa.nMaxLargura);
   expect(nW).toBeGreaterThan(nH + 4);
}

export async function assertSemRolagemHorizontalPagina(page: Page): Promise<void> {
   const oMedidas = await page.evaluate(() => ({
      nScrollW: document.documentElement.scrollWidth,
      nClientW: document.documentElement.clientWidth,
   }));
   expect(oMedidas.nScrollW).toBeLessThanOrEqual(oMedidas.nClientW + 1);
}

export function faixasAtuais(page: Page): {menu: oFaixaAlturaLogo; rodape: oFaixaAlturaLogo} {
   const nW = page.viewportSize()?.width ?? 1280;
   return faixasLogoPorViewport(nW);
}

export {C_LOGO_URL_HORIZONTAL, C_TOKEN_LOGO_HORIZONTAL, C_TOKEN_SEM_LOGO};