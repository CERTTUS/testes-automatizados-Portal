import {test, expect} from '@playwright/test';
import {encerrarOsDoSpec, prepararOsDoSpec} from '../../helpers/portalMassaOs';
import type {OsDeTeste} from '../../helpers/portalMassaOs';
import {
   TELEFONE_A,
   TELEFONE_B,
   TELEFONE_INVALIDO,
   emitirLink,
   esperarSemLinkAtivo,
   exigirChaveApi,
   lerJson,
   montarCorpo,
   registrarEvidenciaApi,
   revogarLinkDaOs,
} from '../../helpers/portalLink';

/**
 * URG-10463 / URG-10835 — POST /servicos/portal/link (409 devolve oDados.cToken).
 * Módulo: portal-link-409-ctoken · modalidade API (sem navegador).
 * CT-API-06 fica só no Jest do api-microservicos (conflito de token não reproduzível por HTTP).
 */

/**
 * Massa (massa-local.md): este arquivo CRIA a própria OS no beforeAll (api-mobile) e usa somente ela; o E2E
 * (acesso-negado.e2e.spec.ts) cria outra. Assim os arquivos rodam em paralelo sem colisão e nunca tocam OS
 * que o teste não criou. Dentro do arquivo os CTs são seriais e cada um revoga o link antes/depois.
 */
const C_SPEC = 'api';
let oOs: OsDeTeste;
/** Número da OS criada pelo beforeAll (lido a cada uso; o describe é registrado antes do beforeAll rodar). */
const cOs = (): string => oOs.ordemServico;

const N_TENTATIVAS_CORRIDA = Number(process.env.PORTAL_CORRIDA_TENTATIVAS ?? '30');

// Serial dentro do arquivo (OS compartilhada entre CT-API-01/09); arquivos distintos rodam em paralelo.
test.describe.configure({mode: 'serial'});

test.describe('Portal link 409 cToken (API)', () => {
   test.beforeAll(async ({playwright}) => {
      test.setTimeout(180_000); // login + descoberta + criação da OS + espera do link automático
      exigirChaveApi();
      oOs = await prepararOsDoSpec(playwright, C_SPEC);
   });

   test.afterAll(async ({playwright}) => {
      await encerrarOsDoSpec(playwright, C_SPEC);
   });

   function comLimpeza() {
      test.beforeEach(async ({request}) => {
         await revogarLinkDaOs(request, cOs());
      });
      test.afterEach(async ({request}) => {
         await revogarLinkDaOs(request, cOs());
      });
   }

   test.describe('CT-API-01 corrida com telefones diferentes', () => {
      comLimpeza();

      test('Emitir link em paralelo com telefones diferentes devolve 200 e 409 com cToken (CT-API-01)', async ({
         request,
      }, testInfo) => {
         test.setTimeout(N_TENTATIVAS_CORRIDA * 8_000 + 15_000);
         const cOsCt = cOs();
         let lParObservado = false;
         let nUltimoStatusA = 0;
         let nUltimoStatusB = 0;

         for (let n = 1; n <= N_TENTATIVAS_CORRIDA && !lParObservado; n++) {
            await revogarLinkDaOs(request, cOsCt);
            const [oResA, oResB] = await Promise.all([
               emitirLink(request, montarCorpo(cOsCt, TELEFONE_A)),
               emitirLink(request, montarCorpo(cOsCt, TELEFONE_B)),
            ]);
            nUltimoStatusA = oResA.status();
            nUltimoStatusB = oResB.status();
            const aRes = [oResA, oResB];
            const oVencedora = aRes.find((o) => o.status() === 200);
            const oPerdedora = aRes.find((o) => o.status() === 409);
            if (!oVencedora || !oPerdedora) {
               // Sem corrida real nesta tentativa (200 sequencial): repetir.
               continue;
            }
            lParObservado = true;

            const oJsonV = await lerJson(oVencedora);
            const oJsonP = await lerJson(oPerdedora);
            expect(oJsonV.oDados?.cToken, '200 deve trazer cToken').toBeTruthy();
            expect(oJsonP.lSucesso).toBe(false);
            expect(oJsonP.cMensagem, '409 deve trazer cMensagem').toBeTruthy();
            expect(typeof oJsonP.oDados?.cToken).toBe('string');
            expect((oJsonP.oDados?.cToken ?? '').length).toBeGreaterThan(0);
            expect(oJsonP.oDados?.lHashAtualizado).toBe(false);
            expect(oJsonP.oDados?.cToken, '409 deve devolver o token da vencedora').toBe(oJsonV.oDados?.cToken);
            await registrarEvidenciaApi(testInfo, 'CT-API-01', oPerdedora, '409 da perdedora devolve o cToken da vencedora com lHashAtualizado:false.');
         }

         expect(
            lParObservado,
            `nenhum par 200/409 em ${N_TENTATIVAS_CORRIDA} tentativas (últimos status: ${nUltimoStatusA}/${nUltimoStatusB})`,
         ).toBe(true);
      });
   });

   test.describe('CT-API-02 corrida com o mesmo telefone', () => {
      comLimpeza();

      test('Emitir link em paralelo com o mesmo telefone devolve 200 nas duas requisições (CT-API-02)', async ({
         request,
      }, testInfo) => {
         const cOsCt = cOs();
         const [oResA, oResB] = await Promise.all([
            emitirLink(request, montarCorpo(cOsCt, TELEFONE_A)),
            emitirLink(request, montarCorpo(cOsCt, TELEFONE_A)),
         ]);
         expect(oResA.status()).toBe(200);
         expect(oResB.status()).toBe(200);
         const oJsonA = await lerJson(oResA);
         const oJsonB = await lerJson(oResB);
         expect(oJsonA.oDados?.cToken).toBeTruthy();
         expect(oJsonB.oDados?.cToken).toBe(oJsonA.oDados?.cToken);
         expect(oJsonA.oDados?.lHashAtualizado).toBe(false);
         expect(oJsonB.oDados?.lHashAtualizado).toBe(false);
         await registrarEvidenciaApi(testInfo, 'CT-API-02', oResB, 'Mesmo telefone em paralelo: 200/200 com o mesmo cToken.');
      });
   });

   test.describe('CT-API-03 sequência com telefones diferentes', () => {
      comLimpeza();

      test('Emitir link em sequência com telefones diferentes atualiza o telefone do link (CT-API-03)', async ({
         request,
      }, testInfo) => {
         const cOsCt = cOs();
         const oRes1 = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_A));
         expect(oRes1.status()).toBe(200);
         const oJson1 = await lerJson(oRes1);
         expect(oJson1.oDados?.cToken).toBeTruthy();

         const oRes2 = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_B));
         expect(oRes2.status()).toBe(200);
         const oJson2 = await lerJson(oRes2);
         expect(oJson2.oDados?.cToken).toBe(oJson1.oDados?.cToken);
         expect(oJson2.oDados?.lHashAtualizado).toBe(true);
         await registrarEvidenciaApi(testInfo, 'CT-API-03', oRes2, 'Segundo telefone no mesmo link devolve 200, mesmo cToken e lHashAtualizado:true.');
      });
   });

   test.describe('Negativos (sem criar link)', () => {
      // Sem afterEach de revogar: esperarSemLinkAtivo já revoga se houver link indevido.
      test.beforeEach(async ({request}) => {
         await revogarLinkDaOs(request, cOs());
      });

      test('Emitir link sem informar o celular retorna erro de validação (CT-API-04)', async ({request}, testInfo) => {
         const cOsCt = cOs();
         const oRes = await emitirLink(request, montarCorpo(cOsCt));
         expect(oRes.status()).toBe(400);
         const oJson = await lerJson(oRes);
         expect(oJson.lSucesso).toBe(false);
         expect(oJson.cMensagem ?? '').toMatch(/cTelefone/i);
         expect(oJson.cMensagem ?? '').toMatch(/obrigat/i);
         await registrarEvidenciaApi(testInfo, 'CT-API-04', oRes, '400 com mensagem de cTelefone obrigatório; nenhum link criado.');
         await esperarSemLinkAtivo(request, cOsCt);
      });

      test('Emitir link com telefone inválido retorna 422 (CT-API-05)', async ({request}, testInfo) => {
         const cOsCt = cOs();
         const oRes = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_INVALIDO));
         expect(oRes.status()).toBe(422);
         const oJson = await lerJson(oRes);
         expect(oJson.lSucesso).toBe(false);
         expect(oJson.cMensagem ?? '').toMatch(/telefone/i);
         expect(oJson.cMensagem ?? '').toMatch(/inv[aá]lid/i);
         await registrarEvidenciaApi(testInfo, 'CT-API-05', oRes, '422 com mensagem de telefone inválido; nenhum link criado.');
         await esperarSemLinkAtivo(request, cOsCt);
      });

      test('Emitir link sem chave de API retorna 401 (CT-API-08)', async ({request}, testInfo) => {
         const cOsCt = cOs();
         const oRes = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_A), false);
         expect(oRes.status()).toBe(401);
         await registrarEvidenciaApi(testInfo, 'CT-API-08', oRes, '401 sem o header chaveapi; nenhum link criado.');
         await esperarSemLinkAtivo(request, cOsCt);
      });
   });

   test.describe('CT-API-07 reemissão com o mesmo telefone', () => {
      comLimpeza();

      test('Reemitir link com o mesmo telefone reaproveita o token sem alterar o contrato do 200 (CT-API-07)', async ({
         request,
      }, testInfo) => {
         const cOsCt = cOs();
         const oRes1 = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_A));
         expect(oRes1.status()).toBe(200);
         const oJson1 = await lerJson(oRes1);

         const oRes2 = await emitirLink(request, montarCorpo(cOsCt, TELEFONE_A));
         expect(oRes2.status()).toBe(200);
         const oJson2 = await lerJson(oRes2);
         expect(oJson1.oDados?.cToken).toBeTruthy();
         expect(oJson2.oDados?.cToken).toBe(oJson1.oDados?.cToken);
         expect(oJson2.oDados?.lHashAtualizado).toBe(false);
         expect(oJson2.lSucesso).toBe(true);
         expect(oJson2.cMensagem ?? '').toMatch(/link/i);
         await registrarEvidenciaApi(testInfo, 'CT-API-07', oRes2, 'Reemissão com o mesmo telefone: 200, mesmo cToken, lHashAtualizado:false.');
      });
   });

   test.describe('CT-API-09 perdedor não altera o telefone', () => {
      comLimpeza();

      test('Perdedor da corrida não altera o telefone do link ativo (CT-API-09)', async ({request}, testInfo) => {
         test.setTimeout(N_TENTATIVAS_CORRIDA * 10_000 + 15_000);
         const cOsCt = cOs();
         let lParObservado = false;

         for (let n = 1; n <= N_TENTATIVAS_CORRIDA && !lParObservado; n++) {
            await revogarLinkDaOs(request, cOsCt);
            // O vencedor é descoberto pelo status (200 = vencedor, 409 = perdedor).
            const [oResA, oResB] = await Promise.all([
               emitirLink(request, montarCorpo(cOsCt, TELEFONE_A)),
               emitirLink(request, montarCorpo(cOsCt, TELEFONE_B)),
            ]);
            const nA = oResA.status();
            const nB = oResB.status();
            if (!((nA === 200 && nB === 409) || (nA === 409 && nB === 200))) {
               continue;
            }
            lParObservado = true;
            const cTelefoneVencedor = nA === 200 ? TELEFONE_A : TELEFONE_B;
            const oJsonV = await lerJson(nA === 200 ? oResA : oResB);

            const oRes = await emitirLink(request, montarCorpo(cOsCt, cTelefoneVencedor));
            expect(oRes.status()).toBe(200);
            const oJson = await lerJson(oRes);
            expect(oJson.oDados?.cToken).toBe(oJsonV.oDados?.cToken);
            expect(oJson.oDados?.lHashAtualizado).toBe(false);
            await registrarEvidenciaApi(testInfo, 'CT-API-09', oRes, 'Reemissão com o telefone do vencedor mantém cToken e lHashAtualizado:false (perdedor não alterou o telefone).');
         }

         expect(lParObservado, `nenhum par 200/409 em ${N_TENTATIVAS_CORRIDA} tentativas`).toBe(true);
      });
   });
});
