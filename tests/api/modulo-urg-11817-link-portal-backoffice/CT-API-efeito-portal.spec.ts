import {expect, request as oPlaywrightRequest, test, type APIRequestContext} from '@playwright/test';
import {
   bancoFechar,
   osConsolidacaoCarregar,
   osDadosCarregar,
   osMassaCarregar,
} from '../../e2e/helpers/portal/backofficeLinkBanco';
import {
   C_EMPRESA,
   C_TELEFONE_A,
   C_TELEFONE_B,
   lChaveConfigurada,
   linkEmitir,
   linkRevogar,
} from '../../e2e/helpers/portal/backofficeLinkMs';
import {acessoTelefone, landingBff, osDetalhe} from '../../e2e/helpers/portal/portalBffAcesso';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

/**
 * Bloco 3 — efeito do link emitido pelo BackOffice na API do Portal (BFF, porta 3333).
 * beforeAll próprio: revoga e emite com o telefone A na OS de massa (não depende do outro arquivo).
 * Os CT-API-12..17 rodam em sequência (serial); os dois últimos são independentes.
 * Celular no BFF segue /^55\d{10,11}$/ (a tela do Portal normaliza o DDD+número antes de enviar).
 */
const C_CELULAR_A_BFF = C_TELEFONE_A; // 5546991178665
const C_CELULAR_B_BFF = C_TELEFONE_B; // 5546991064223

test.describe('API — efeito do link no Portal (URG-11817)', () => {
   test.skip(!lChaveConfigurada(), 'PORTAL_BO_MS_CHAVEAPI não configurada no .env.local');

   let oReq: APIRequestContext;
   let cOs = '';
   let cToken = '';

   /** Contexto novo por cenário: cookies isolados. */
   async function contextoNovo(): Promise<APIRequestContext> {
      return oPlaywrightRequest.newContext();
   }

   test.beforeAll(async () => {
      oReq = await oPlaywrightRequest.newContext();
      cOs = await osMassaCarregar();
      expect(cOs, 'OS de massa não encontrada no banco').not.toBe('');
      const oRev = await linkRevogar(oReq, {cOrdemServico: cOs});
      expect([200, 404], `limpeza: ${oRev.cTexto}`).toContain(oRev.nStatus);
      const oEmi = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A});
      expect(oEmi.nStatus, oEmi.cTexto).toBe(200);
      cToken = oEmi.oBody.oDados.cToken;
   });

   test.afterAll(async () => {
      if (oReq && cOs) {
         await linkRevogar(oReq, {cOrdemServico: cOs}).catch(() => undefined);
         const cOsConsolidacao = await osConsolidacaoCarregar().catch(() => '');
         if (cOsConsolidacao) {
            await linkRevogar(oReq, {cOrdemServico: cOsConsolidacao, cEmpresa: C_EMPRESA}).catch(() => undefined);
         }
      }
      await oReq?.dispose();
      await bancoFechar();
   });

   test.describe('sequência', () => {
      test.describe.configure({mode: 'serial'});

      test('CT-API-12 — Landing após emissão', async ({}, testInfo) => {
         const oCtx = await contextoNovo();
         const oR = await landingBff(oCtx, cToken);
         await evidenciarApiPreCr(testInfo, 'CT-API-12', oR.nStatus, oR.cUrl, oR.cTexto);
         expect(oR.nStatus, oR.cTexto).toBe(200);
         expect(oR.oBody.lSucesso).toBe(true);
         expect(String(oR.oBody.oDados.cNomeFantasia ?? '').trim()).not.toBe('');
         await oCtx.dispose();
      });

      test('CT-API-13 — Acesso com o celular certo', async ({}, testInfo) => {
         const oCtx = await contextoNovo();
         const oR = await acessoTelefone(oCtx, cToken, C_CELULAR_A_BFF);
         await evidenciarApiPreCr(testInfo, 'CT-API-13', oR.nStatus, oR.cUrl, oR.cTexto);
         expect(oR.nStatus, oR.cTexto).toBe(200);
         expect(oR.lCookieSessao, 'Set-Cookie portal_sessao').toBe(true);
         await oCtx.dispose();
      });

      test('CT-API-14 — Acesso com celular errado', async ({}, testInfo) => {
         const oCtx = await contextoNovo();
         const oR = await acessoTelefone(oCtx, cToken, '5546999999999');
         await evidenciarApiPreCr(testInfo, 'CT-API-14', oR.nStatus, oR.cUrl, oR.cTexto);
         testInfo.annotations.push({type: 'status-real', description: `HTTP ${oR.nStatus}`});
         expect(oR.nStatus, oR.cTexto).toBeGreaterThanOrEqual(400);
         expect(oR.nStatus, oR.cTexto).toBeLessThan(500);
         expect(oR.lCookieSessao).toBe(false);
         await oCtx.dispose();
      });

      test('CT-API-15 — Depois da troca de celular', async ({}, testInfo) => {
         const oTroca = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_B});
         expect(oTroca.nStatus, oTroca.cTexto).toBe(200);
         expect(oTroca.oBody.oDados.lHashAtualizado).toBe(true);
         expect(oTroca.oBody.oDados.cToken).toBe(cToken);

         const oCtxB = await contextoNovo();
         const oB = await acessoTelefone(oCtxB, cToken, C_CELULAR_B_BFF);
         await evidenciarApiPreCr(testInfo, 'CT-API-15', oB.nStatus, oB.cUrl, oB.cTexto);
         expect(oB.nStatus, oB.cTexto).toBe(200);
         expect(oB.lCookieSessao).toBe(true);

         const oCtxA = await contextoNovo();
         const oA = await acessoTelefone(oCtxA, cToken, C_CELULAR_A_BFF);
         testInfo.annotations.push({type: 'status-real-telefone-antigo', description: `HTTP ${oA.nStatus}`});
         expect(oA.nStatus, oA.cTexto).toBeGreaterThanOrEqual(400);
         expect(oA.lCookieSessao).toBe(false);
         await oCtxA.dispose();
         await oCtxB.dispose();
      });

      test('CT-API-17 — Detalhe da OS', async ({}, testInfo) => {
         // O telefone vigente é o B (CT-API-15). O id público da OS vem do acesso (cOsPublicId).
         const oCtx = await contextoNovo();
         const oAcesso = await acessoTelefone(oCtx, cToken, C_CELULAR_B_BFF);
         expect(oAcesso.nStatus, oAcesso.cTexto).toBe(200);
         const cOsPublicId = String(oAcesso.oBody.oDados.cOsPublicId);
         const oR = await osDetalhe(oCtx, cOsPublicId);
         await evidenciarApiPreCr(testInfo, 'CT-API-17', oR.nStatus, oR.cUrl, oR.cTexto);
         expect(oR.nStatus, oR.cTexto).toBe(200);
         const oOs = oR.oBody.oDados.oOrdemServico;
         const oBanco = await osDadosCarregar(C_EMPRESA, cOs);
         expect(oBanco, 'OS de massa no banco').not.toBeNull();
         expect(String(oOs.cNumeroOs).trim()).toBe(cOs);
         const fNorm = (c: string) => c.replace(/\s+/g, ' ').trim().toLowerCase();
         const cVeiculoPortal = fNorm(
            [oOs.oVeiculo?.cMarca, oOs.oVeiculo?.cModelo].filter((c: unknown) => !!c).join(' '),
         );
         const cDescricaoBanco = fNorm(oBanco!.cVeiculoDescricao);
         testInfo.annotations.push({
            type: 'veiculo',
            description: `portal="${cVeiculoPortal}" banco="${cDescricaoBanco}"`,
         });
         expect(
            cVeiculoPortal.includes(cDescricaoBanco) || cDescricaoBanco.includes(cVeiculoPortal),
            `veículo do Portal (${cVeiculoPortal}) deve casar com PCRTVEI0.DESCRI (${cDescricaoBanco})`,
         ).toBe(true);
         await oCtx.dispose();
      });

      test('CT-API-16 — Depois da revogação', async ({}, testInfo) => {
         const oRev = await linkRevogar(oReq, {cOrdemServico: cOs});
         expect(oRev.nStatus, oRev.cTexto).toBe(200);

         const oCtx = await contextoNovo();
         const oLanding = await landingBff(oCtx, cToken);
         await evidenciarApiPreCr(testInfo, 'CT-API-16', oLanding.nStatus, oLanding.cUrl, oLanding.cTexto);
         expect(oLanding.nStatus, oLanding.cTexto).toBe(410);
         expect(oLanding.oBody.lSucesso).toBe(false);

         const oAcesso = await acessoTelefone(oCtx, cToken, C_CELULAR_B_BFF);
         testInfo.annotations.push({type: 'status-real-acesso', description: `HTTP ${oAcesso.nStatus}`});
         expect(oAcesso.nStatus, oAcesso.cTexto).toBeGreaterThanOrEqual(400);
         expect(oAcesso.lCookieSessao).toBe(false);
         await oCtx.dispose();
      });
   });

   // Fim da suíte: testes independentes entre si (um que falhe não pula o outro).
   test.describe('independentes', () => {
      test.describe.configure({mode: 'default'});

      // GET /cliente/os (lista) não é testado: no BFF a rota é um stub que responde 501 "Não implementado".
      // A OS do link é conferida pelo detalhe (/cliente/os/:cOsPublicId) no CT-API-17.

      // Por último: se o Portal não entregar a OS da filial 0002, não bloqueia os demais CTs.
      test('CT-API-07b — Consolidação: Portal aceita o celular e entrega a OS da filial 0002', async ({}, testInfo) => {
         // Limitação conhecida do MS (URG-11892, 17/11/2026): o link é gravado com a empresa de consolidação de
         // produção (regra do BackOffice e do Touch) e PortalOsClienteServico.clienteCarregar busca a OS por essa
         // empresa; OS com EMPFIL diferente (ex.: OS antigas da filial 0002) dão 404 "Ordem de serviço não encontrada.".
         // No uso real desta base a recepção da 0002 grava a OS na 0001 (CT-1 na filial 0002, OS 027017, passou).
         // test.fail: a suíte fica verde e este CT passa a acusar "passou inesperadamente" se o MS corrigir.
         test.fail(true, 'Limitação conhecida do MS: OS com EMPFIL diferente da consolidação de produção não abre no Portal');
         testInfo.annotations.push({type: 'limitacao-conhecida', description: 'MS busca a OS pela empresa do link (consolidação de produção)'});
         const cOsConsolidacao = await osConsolidacaoCarregar();
         expect(cOsConsolidacao, 'OS da filial 0002 não encontrada').not.toBe('');
         const oEmi = await linkEmitir(oReq, {cOrdemServico: cOsConsolidacao, cEmpresa: C_EMPRESA, cTelefone: C_TELEFONE_A});
         expect(oEmi.nStatus, oEmi.cTexto).toBe(200);
         const cTokenCons = oEmi.oBody.oDados.cToken as string;

         const oCtx = await contextoNovo();
         const oAcesso = await acessoTelefone(oCtx, cTokenCons, C_CELULAR_A_BFF);
         await evidenciarApiPreCr(testInfo, 'CT-API-07b', oAcesso.nStatus, oAcesso.cUrl, oAcesso.cTexto);
         expect(oAcesso.nStatus, oAcesso.cTexto).toBe(200);
         expect(oAcesso.lCookieSessao).toBe(true);
         const oDet = await osDetalhe(oCtx, String(oAcesso.oBody.oDados.cOsPublicId));
         expect(oDet.nStatus, oDet.cTexto).toBe(200);
         expect(String(oDet.oBody.oDados.oOrdemServico.cNumeroOs).trim()).toBe(cOsConsolidacao);
         await oCtx.dispose();
      });
   });
});
