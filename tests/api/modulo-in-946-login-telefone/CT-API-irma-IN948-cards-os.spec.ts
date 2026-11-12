// pendente-irma:IN-948 — não entra na bateria que decide o PASSOU da IN-947 (HARNESS_MULTI_DEV_PR).
// Cobre os dados dos cards da O.S. (checklist, serviços, peças, fotos) para o hop da IN-948.
import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {obterCookiePortalSessao} from '../../e2e/helpers/portalAcessoApiHelpers';
import {
   C_MENSAGEM_ACESSO_NEGADO,
   C_TOKEN_OS_COM_ITENS,
   C_TOKEN_OS_OUTRA,
   C_TOKEN_OS_SEM_ITENS,
   cookieHeaderDe,
   respostaApiLer,
} from './loginD1Api';

type oOrdemServicoCards = {
   mChecklist?: unknown[];
   mServicos?: unknown[];
   mPecas?: unknown[];
   mFotos?: unknown[];
   mAbasOrdem?: string[];
};

function oOrdemServicoDe(oCorpo: Record<string, unknown>): oOrdemServicoCards | undefined {
   return (oCorpo.oDados as {oOrdemServico?: oOrdemServicoCards} | undefined)?.oOrdemServico;
}

const cUrlDetalhe = (cId: string) => `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(cId)}`;

test.describe('API — irmã IN-948: dados dos cards da O.S. (pendente-irma)', () => {
   test.beforeEach(async ({}, testInfo) => {
      testInfo.annotations.push({type: 'pendente-irma', description: 'IN-948'});
   });

   test('CT-API-07 — Detalhe da O.S. com sessão devolve as listas dos cards', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_COM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_COM_ITENS);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-07', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oOs = oOrdemServicoDe(oCorpo);
      expect(oOs?.mChecklist?.length ?? 0).toBeGreaterThan(0);
      expect(oOs?.mServicos?.length ?? 0).toBeGreaterThan(0);
      expect(oOs?.mPecas?.length ?? 0).toBeGreaterThan(0);
      expect(oOs?.mAbasOrdem).toEqual(
         expect.arrayContaining(['checklist', 'fotos', 'servicos', 'pecas']),
      );
   });

   test('CT-API-08 — O.S. sem itens devolve listas vazias', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_SEM_ITENS);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-08', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oOs = oOrdemServicoDe(oCorpo);
      for (const cChave of ['mChecklist', 'mServicos', 'mPecas', 'mFotos'] as const) {
         expect(Array.isArray(oOs?.[cChave]), cChave).toBe(true);
         expect(oOs?.[cChave]).toEqual([]);
      }
   });

   test('CT-API-09 — Fotos da O.S. com sessão devolve as fotos por fase', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_COM_ITENS);
      const cUrl = `${cUrlDetalhe(C_TOKEN_OS_COM_ITENS)}/fotos`;
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-09', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const mFases =
         (oCorpo.oDados as {mFotosPorFase?: Array<{mFotos?: unknown[]}>} | undefined)?.mFotosPorFase ?? [];
      expect(mFases.some((oFase) => (oFase.mFotos?.length ?? 0) > 0)).toBe(true);
   });

   test('CT-API-10 — Detalhe da O.S. sem sessão é recusado', async ({request}, testInfo) => {
      const cUrl = cUrlDetalhe(C_TOKEN_OS_COM_ITENS);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-10', cUrl);
      expect(nStatus, cTexto).toBe(401);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe('Sessão não autenticada');
      expect(oOrdemServicoDe(oCorpo)).toBeUndefined();
   });

   test('CT-API-11 — Detalhe de O.S. que não é da sessão é recusado', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_OUTRA);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-11', cUrl);
      expect(nStatus, cTexto).toBe(403);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_ACESSO_NEGADO);
      expect(oOrdemServicoDe(oCorpo)).toBeUndefined();
   });
});
