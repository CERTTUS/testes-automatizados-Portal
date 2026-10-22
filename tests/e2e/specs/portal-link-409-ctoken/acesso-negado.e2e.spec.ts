import {test, expect} from '@playwright/test';
import type {Page, TestInfo} from '@playwright/test';
import {encerrarOsDoSpec, prepararOsDoSpec} from '../../helpers/portalMassaOs';
import type {OsDeTeste} from '../../helpers/portalMassaOs';
import {
   TELEFONE_A,
   emitirLink,
   exigirChaveApi,
   lerJson,
   montarCorpo,
   revogarLinkDaOs,
} from '../../helpers/portalLink';
import {evidenciarPassoSmokePreCr, evidenciarSmokePreCr} from '../../helpers/pre-cr/evidenciarSmokePreCr';

/**
 * URG-10463 / URG-10835 — CT-E2E-01 (ex CT-MAN-02): celular diferente do cadastrado no link
 * recebe "Acesso não autorizado" no Portal. Fluxo REAL (sem mock): link emitido via
 * POST /servicos/portal/link, portal web em E2E_BASE_URL e BFF portalcliente-api.
 * Massa: este arquivo CRIA a própria OS no beforeAll (api-mobile) e usa somente ela (paralelo com api.spec.ts).
 * A flag do Portal é habilitada/restaurada pelo projeto de setup/teardown — não por este arquivo.
 * Evidência (rule qa-evidencia-por-modalidade, N=3 passos): 01-landing, 02-acesso-negado, 03-acesso-permitido
 * + 99-tela-final; com PRE_CR=1 também clipes/ciclo via helpers pre-cr.
 */

const C_CT = 'CT-E2E-01';
const C_SPEC = 'e2e-acesso-negado';
let oOs: OsDeTeste;
/** Telefone fictício diferente do cadastrado no link (A = 11999990001). */
const TELEFONE_DIFERENTE = '47999990001';

async function landingProntaAguardar(oPage: Page, cToken: string): Promise<void> {
   await oPage.goto(`/${cToken}`);
   await expect(oPage.locator('form.acesso-form')).toHaveAttribute('data-hidratado', 'true');
   await expect(oPage.locator('input[name="telefone"]')).toBeVisible();
}

/** Evidência do passo: anexo no relatório (sempre) e pacote PRE_CR (foto + clipe pontual) quando PRE_CR=1. */
async function evidenciarPasso(oPage: Page, oInfo: TestInfo, nOrdem: number, cSlug: string): Promise<void> {
   await oInfo.attach(`${C_CT}-${String(nOrdem).padStart(2, '0')}-${cSlug}.png`, {
      body: await oPage.screenshot({fullPage: false}),
      contentType: 'image/png',
   });
   await evidenciarPassoSmokePreCr(oPage, oInfo, C_CT, nOrdem, cSlug);
}

test.describe('Portal link 409 cToken (E2E)', () => {
   test.beforeAll(async ({playwright}) => {
      test.setTimeout(180_000); // login + descoberta + criação da OS + espera do link automático
      exigirChaveApi();
      oOs = await prepararOsDoSpec(playwright, C_SPEC);
   });

   test.afterAll(async ({playwright}) => {
      await encerrarOsDoSpec(playwright, C_SPEC);
   });

   test.beforeEach(async ({request}) => {
      await revogarLinkDaOs(request, oOs.ordemServico);
   });

   test.afterEach(async ({request}) => {
      await revogarLinkDaOs(request, oOs.ordemServico);
   });

   test('Celular diferente do cadastrado na OS recebe Acesso não autorizado no Portal (CT-E2E-01)', async ({
      page,
      request,
   }, testInfo) => {
      test.setTimeout(process.env.PRE_CR === '1' ? 240_000 : 60_000);

      // Dado um link emitido para o celular A
      const oRes = await emitirLink(request, montarCorpo(oOs.ordemServico, TELEFONE_A));
      expect(oRes.status(), 'emissão do link deve retornar 200').toBe(200);
      const cToken = (await lerJson(oRes)).oDados?.cToken ?? '';
      expect(cToken, 'cToken do link emitido').not.toBe('');

      // Quando abrir o link (landing) e informar o celular B
      await landingProntaAguardar(page, cToken);
      await evidenciarPasso(page, testInfo, 1, 'landing-acesso');
      const oRespostaNegada = page.waitForResponse(
         (oR) => oR.url().includes('/api/bff/acesso/telefone') && oR.request().method() === 'POST',
      );
      await page.locator('input[name="telefone"]').fill(TELEFONE_DIFERENTE);
      await page.getByRole('button', {name: 'Acessar'}).click();
      expect((await oRespostaNegada).status(), 'BFF deve negar acesso (403)').toBe(403);

      // Então exibir o erro, permanecer na landing e não mostrar dados da OS
      await expect(page.locator('.acesso-alerta-erro')).toContainText('Acesso não autorizado');
      await expect(page).toHaveURL(new RegExp(`/${cToken}$`));
      await expect(page).not.toHaveURL(/\/os\//);
      await expect(page.locator('input[name="telefone"]')).toBeVisible();
      await expect(page.getByText(oOs.ordemServico)).toHaveCount(0);
      await evidenciarPasso(page, testInfo, 2, 'acesso-negado');

      // Fase positiva: o celular A cadastrado acessa a OS
      await landingProntaAguardar(page, cToken);
      await page.locator('input[name="telefone"]').fill(TELEFONE_A);
      await page.getByRole('button', {name: 'Acessar'}).click();
      await expect(page).toHaveURL(new RegExp(`/os/${cToken}`), {timeout: 15_000});
      await evidenciarPasso(page, testInfo, 3, 'acesso-permitido');
      await evidenciarSmokePreCr(page, testInfo, C_CT, 'celular cadastrado acessa a OS');
   });
});
