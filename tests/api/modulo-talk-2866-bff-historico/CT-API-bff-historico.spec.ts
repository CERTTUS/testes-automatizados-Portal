import {expect, test, type APIRequestContext, type APIResponse} from '@playwright/test';
import type {TestInfo} from '@playwright/test';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {
   C_FAVICON_URL,
   C_TOKEN_ALVO_NEGADO,
   C_TOKEN_ALVO_OK,
   C_TOKEN_ALVO_REVOGADO,
   C_TOKEN_LINK_FAVICON,
   C_TOKEN_LINK_SEM_FAVICON,
   C_TOKEN_SESSAO,
   C_TOKEN_SESSAO_422,
   sessaoCriar,
   stubRequisicoesLimpar,
   stubRequisicoesObter,
   type oRequisicaoStub,
} from './historicoStub';

async function oRespostaApi(
   oRes: APIResponse,
   testInfo: TestInfo,
   cCtId: string,
): Promise<{nStatus: number; cUrl: string; cTextoCorpo: string; oCorpo: Record<string, unknown>}> {
   const nStatus = oRes.status();
   const cUrl = oRes.url();
   const cTextoCorpo = await oRes.text();
   await evidenciarApiPreCr(testInfo, cCtId, nStatus, cUrl, cTextoCorpo);
   return {nStatus, cUrl, cTextoCorpo, oCorpo: JSON.parse(cTextoCorpo) as Record<string, unknown>};
}

function mReqsPorTrecho(mReqs: oRequisicaoStub[], cTrecho: string): oRequisicaoStub[] {
   return mReqs.filter(
      (oReq) => oReq.cPath.includes(cTrecho) && !oReq.cPath.includes('/validar-acesso'),
   );
}

async function comSessao(
   playwrightRequest: typeof import('@playwright/test').request,
   request: APIRequestContext,
   cToken: string,
   fExecutar: (oSessao: APIRequestContext) => Promise<void>,
): Promise<void> {
   const oSessao = await sessaoCriar(playwrightRequest, cToken);
   try {
      await stubRequisicoesLimpar(request);
      await fExecutar(oSessao);
   } finally {
      await oSessao.dispose();
   }
}

test.describe('API — BFF histórico, dados do cliente e OS do histórico (TALK-2880)', () => {
   test.describe.configure({mode: 'serial'});

   test.beforeEach(async ({request}) => {
      await stubRequisicoesLimpar(request);
   });

   test('CT-API-01 — GET /portal/:token devolve cFaviconUrl quando o MS envia favicon', async ({
      request,
   }, testInfo) => {
      const oRes = await request.get(`${E2E_API_BASE_URL}/portal/${C_TOKEN_LINK_FAVICON}`);
      const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-01');
      const oDados = oCorpo.oDados as {cFaviconUrl: string | null};
      expect(nStatus).toBe(200);
      expect(oDados.cFaviconUrl).toBe(C_FAVICON_URL);
   });

   test('CT-API-02 — GET /portal/:token devolve cFaviconUrl null quando o MS não envia favicon', async ({
      request,
   }, testInfo) => {
      const oRes = await request.get(`${E2E_API_BASE_URL}/portal/${C_TOKEN_LINK_SEM_FAVICON}`);
      const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-02');
      const oDados = oCorpo.oDados as {cFaviconUrl: string | null};
      expect(nStatus).toBe(200);
      expect(oDados.cFaviconUrl).toBeNull();
   });

   test('CT-API-03 — GET /cliente/historico sem sessão retorna 401 e não chama o MS', async ({
      request,
   }, testInfo) => {
      const oRes = await request.get(`${E2E_API_BASE_URL}/cliente/historico`);
      const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-03');
      const mReqs = await stubRequisicoesObter(request);
      expect(nStatus).toBe(401);
      expect(oCorpo.lSucesso).toBe(false);
      expect(mReqsPorTrecho(mReqs, '/historico')).toEqual([]);
   });

   test('CT-API-04 — GET /cliente/dados sem sessão retorna 401 e não chama o MS', async ({
      request,
   }, testInfo) => {
      const oRes = await request.get(`${E2E_API_BASE_URL}/cliente/dados`);
      const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-04');
      const mReqs = await stubRequisicoesObter(request);
      expect(nStatus).toBe(401);
      expect(mReqsPorTrecho(mReqs, '/cliente')).toEqual([]);
   });

   test('CT-API-05 — GET /cliente/historico autenticado devolve 200, no-store e encaminha chaveapi', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get('/cliente/historico');
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-05');
         const oDados = oCorpo.oDados as {nPeriodoDias: number; mOrdens: Array<{cOsPublicId: string}>};
         const mReqs = mReqsPorTrecho(await stubRequisicoesObter(request), '/historico');
         expect(nStatus).toBe(200);
         expect(oRes.headers()['cache-control']).toBe('no-store');
         expect(oDados.nPeriodoDias).toBe(180);
         expect(oDados.mOrdens[0].cOsPublicId).toBe(C_TOKEN_ALVO_OK);
         expect(mReqs.some((oReq) =>
            oReq.cMetodo === 'GET'
            && oReq.cPath === `/api/v1/servicos/portal/os/${C_TOKEN_SESSAO}/historico`
            && Boolean(oReq.oHeaders.chaveapi),
         )).toBe(true);
      });
   });

   test('CT-API-06 — GET /cliente/historico ignora cToken/cOsPublicId da query e usa o token da sessão', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(
            `/cliente/historico?cToken=${C_TOKEN_ALVO_NEGADO}&cOsPublicId=${C_TOKEN_ALVO_NEGADO}`,
         );
         const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-06');
         const mHist = mReqsPorTrecho(await stubRequisicoesObter(request), '/historico');
         expect(nStatus).toBe(200);
         expect(mHist.length).toBeGreaterThan(0);
         for (const oReq of mHist) {
            expect(oReq.cPath).toContain(C_TOKEN_SESSAO);
            expect(oReq.cPath).not.toContain(C_TOKEN_ALVO_NEGADO);
         }
      });
   });

   test('CT-API-07 — GET /cliente/historico com histórico desabilitado retorna 422', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO_422, async (oSessao) => {
         const oRes = await oSessao.get('/cliente/historico');
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-07');
         expect(nStatus).toBe(422);
         expect(oCorpo.lSucesso).toBe(false);
      });
   });

   test('CT-API-08 — GET /cliente/dados autentica, mascara e descarta cCpfCompleto', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get('/cliente/dados');
         const {nStatus, cTextoCorpo, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-08');
         const oCliente = (oCorpo.oDados as {oCliente: Record<string, unknown>}).oCliente;
         expect(nStatus).toBe(200);
         expect(oRes.headers()['cache-control']).toBe('no-store');
         expect(oCliente.cNome).toBe('Cliente Histórico');
         expect(oCliente.cDocumentoTipo).toBe('CPF');
         expect('cCpfCompleto' in oCliente).toBe(false);
         expect(cTextoCorpo).not.toContain('12345678900');
      });
   });

   test('CT-API-09 — GET /cliente/os/:alvo autentica e envia x-portal-token-origem e x-cliente-ip', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_OK}`);
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-09');
         const oOrdem = (oCorpo.oDados as {
            oOrdemServico: {oFlagsPainel: {historico: boolean}; cOsPublicId: string};
         }).oOrdemServico;
         const mDetalhe = mReqsPorTrecho(await stubRequisicoesObter(request), `/os/${C_TOKEN_ALVO_OK}/detalhe`);
         expect(nStatus).toBe(200);
         expect(oOrdem.oFlagsPainel.historico).toBe(true);
         expect(oOrdem.cOsPublicId).toBe(C_TOKEN_ALVO_OK);
         expect(mDetalhe.length).toBeGreaterThan(0);
         expect(mDetalhe[0].oHeaders['x-portal-token-origem']).toBe(C_TOKEN_SESSAO);
         expect(mDetalhe[0].oHeaders['x-cliente-ip']).toBeTruthy();
      });
   });

   test('CT-API-10 — GET /cliente/os/:alvo negado retorna 403 Acesso não autorizado', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_NEGADO}`);
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-10');
         expect(nStatus).toBe(403);
         expect(oCorpo).toMatchObject({lSucesso: false, cMensagem: 'Acesso não autorizado'});
      });
   });

   test('CT-API-11 — GET /cliente/os/:revogado mapeia 410 do MS para 403', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_REVOGADO}`);
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-11');
         expect(nStatus).toBe(403);
         expect(oCorpo.cMensagem).toBe('Acesso não autorizado');
      });
   });

   test('CT-API-12 — GET /cliente/os/:alvo/fotos autentica e encaminha origem e IP', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_OK}/fotos`);
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-12');
         const oDados = oCorpo.oDados as {mFotosPorFase: unknown[]};
         const mFotos = mReqsPorTrecho(await stubRequisicoesObter(request), `/os/${C_TOKEN_ALVO_OK}/fotos`);
         expect(nStatus).toBe(200);
         expect(oDados.mFotosPorFase.length).toBe(1);
         expect(mFotos.length).toBeGreaterThan(0);
         expect(mFotos[0].oHeaders['x-portal-token-origem']).toBe(C_TOKEN_SESSAO);
         expect(mFotos[0].oHeaders['x-cliente-ip']).toBeTruthy();
      });
   });

   test('CT-API-13 — GET /cliente/os da própria sessão não envia x-portal-token-origem', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_SESSAO}`);
         const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-13');
         const mDetalhe = mReqsPorTrecho(await stubRequisicoesObter(request), `/os/${C_TOKEN_SESSAO}/detalhe`);
         expect(nStatus).toBe(200);
         expect(mDetalhe.length).toBeGreaterThan(0);
         expect(mDetalhe[0].oHeaders['x-portal-token-origem']).toBeUndefined();
      });
   });

   test('CT-API-14 — GET /cliente/os com token > 64 caracteres retorna 400 sem chamar o MS', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${'a'.repeat(65)}`);
         const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-14');
         const mReqs = await stubRequisicoesObter(request);
         expect(nStatus).toBe(400);
         expect(mReqsPorTrecho(mReqs, '/detalhe')).toEqual([]);
      });
   });

   test('CT-API-15 — GET /cliente/os/:alvo/fotos negado retorna 403', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_NEGADO}/fotos`);
         const {nStatus, oCorpo} = await oRespostaApi(oRes, testInfo, 'CT-API-15');
         expect(nStatus).toBe(403);
         expect(oCorpo.cMensagem).toBe('Acesso não autorizado');
      });
   });

   test('CT-API-16 — GET /cliente/os/:alvo sem sessão retorna 401', async ({request}, testInfo) => {
      const oRes = await request.get(`${E2E_API_BASE_URL}/cliente/os/${C_TOKEN_ALVO_OK}`);
      const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-16');
      const mReqs = await stubRequisicoesObter(request);
      expect(nStatus).toBe(401);
      expect(mReqsPorTrecho(mReqs, '/detalhe')).toEqual([]);
   });

   test('CT-API-17 — GET /cliente/os da própria sessão /fotos envia x-cliente-ip e não envia origem', async ({
      playwright,
      request,
   }, testInfo) => {
      await comSessao(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
         const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_SESSAO}/fotos`);
         const {nStatus} = await oRespostaApi(oRes, testInfo, 'CT-API-17');
         const mFotos = mReqsPorTrecho(await stubRequisicoesObter(request), `/os/${C_TOKEN_SESSAO}/fotos`);
         expect(nStatus).toBe(200);
         expect(mFotos.length).toBeGreaterThan(0);
         expect(mFotos[0].oHeaders['x-portal-token-origem']).toBeUndefined();
         expect(mFotos[0].oHeaders['x-cliente-ip']).toBeTruthy();
      });
   });
});
