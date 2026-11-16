import {expect, type Page} from '@playwright/test';
import {
   C_TOKEN_CARDS_SEPARADOS,
   C_TOKEN_TEXTO_INVALIDO,
   C_TOKEN_TEXTO_LEGADO,
   C_TOKEN_TEXTO_PERSONALIZADO,
   O_TEMA_CARDS_SEPARADOS,
   O_TEMA_TEXTO_LEGADO,
} from '../../../api/modulo-talk-3103-cor-texto-elementos/corTextoElementosApi';
import {detalheOsMinimoE2E, type RespostaDetalheOsMock} from './mockDetalheOsMinimo';
import {mockarDetalheOsCliente} from './shellD4Helpers';
import {telefoneAutorizado} from '../portalFixtures';
import {cEnv} from '../env';
import {lHomologPortal} from './massaPortal2881';

const M_NOMES_POR_TOKEN: Record<string, string> = {
   [C_TOKEN_TEXTO_PERSONALIZADO]: 'Oficina Texto Personalizado',
   [C_TOKEN_TEXTO_LEGADO]: 'Oficina Texto Legado',
   [C_TOKEN_TEXTO_INVALIDO]: 'Oficina Texto Inválido',
   [C_TOKEN_CARDS_SEPARADOS]: 'Oficina Cards Separados',
};

function nomeFantasiaLanding(cToken: string): string {
   const cNomeHomolog = cEnv('PORTAL_NOME_T3103_PERSONALIZADO');
   if (lHomologPortal() && cNomeHomolog) {
      return cNomeHomolog;
   }
   if (cToken === C_TOKEN_TEXTO_PERSONALIZADO && cNomeHomolog) {
      return cNomeHomolog;
   }
   return M_NOMES_POR_TOKEN[cToken] ?? 'Oficina';
}

const C_MSG_ERRO_LANDING = 'Não foi possível carregar este link';

export async function landingCorTextoAguardar(
   page: Page,
   cToken: string,
): Promise<void> {
   const cNome = nomeFantasiaLanding(cToken);
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
      await expect(page.getByTestId('acesso-form-login')).toHaveAttribute(
         'data-hidratado',
         'true',
      );
   }
   await expect(page.locator('.acesso-marca__nome')).toHaveText(cNome);
}

export function detalheOsComTemaAvancado(
   cToken: string,
   cNomeFantasia: string,
   oTemaAvancado: Record<string, unknown>,
): RespostaDetalheOsMock {
   const oBase = detalheOsMinimoE2E(cToken, cNomeFantasia);
   const oOrdem = oBase.oDados.oOrdemServico;
   delete oOrdem.oTokensDerivados;
   oOrdem.cCorPrimaria = '#1a5276';
   oOrdem.cTemaModo = 'claro';
   oOrdem.oTemaAvancado = oTemaAvancado;
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

export async function loginPortalComTemaNoDetalhe(
   page: Page,
   cToken: string,
   oTemaAvancado: Record<string, unknown>,
): Promise<void> {
   const cNome = nomeFantasiaLanding(cToken);
   if (!lHomologPortal()) {
      await mockarAcessoTelefoneParaToken(page, cToken);
      await mockarDetalheOsCliente(
         page,
         detalheOsComTemaAvancado(cToken, cNome, oTemaAvancado),
      );
   }
   await landingCorTextoAguardar(page, cToken);

   const oRespostaPromise = page.waitForResponse(
      (oRes) =>
         oRes.url().includes('/api/bff/acesso/telefone') &&
         oRes.request().method() === 'POST',
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
   await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible({
      timeout: 15_000,
   });
}

export async function loginPortalLegadoDetalhe(page: Page): Promise<void> {
   await loginPortalComTemaNoDetalhe(page, C_TOKEN_TEXTO_LEGADO, O_TEMA_TEXTO_LEGADO);
}

export async function loginPortalCardsSeparados(page: Page): Promise<void> {
   await loginPortalComTemaNoDetalhe(
      page,
      C_TOKEN_CARDS_SEPARADOS,
      O_TEMA_CARDS_SEPARADOS,
   );
}