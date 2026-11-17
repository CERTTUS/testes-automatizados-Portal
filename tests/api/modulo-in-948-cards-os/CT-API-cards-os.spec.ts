// Módulo modulo-in-948-cards-os (IN-948, HU IN-946): dados que alimentam os cards/abas da O.S.
// (checklist, serviços, peças, fotos) — regressão de API da entrega de altura padrão e fallbacks.
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
} from '../modulo-in-946-login-telefone/loginD1Api';

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

function mFotosPorFaseDe(oCorpo: Record<string, unknown>): unknown {
   return (oCorpo.oDados as {mFotosPorFase?: unknown} | undefined)?.mFotosPorFase;
}

const cUrlDetalhe = (cId: string) => `${E2E_API_BASE_URL}/cliente/os/${encodeURIComponent(cId)}`;

test.describe('API — IN-948: dados dos cards da O.S.', () => {
   test('CT-API-01 — Detalhe da O.S. com sessão devolve as listas dos cards', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_COM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_COM_ITENS);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-01', cUrl);
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

   test('CT-API-02 — O.S. sem itens devolve listas vazias', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_SEM_ITENS);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-02', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oOs = oOrdemServicoDe(oCorpo);
      for (const cChave of ['mChecklist', 'mServicos', 'mPecas', 'mFotos'] as const) {
         expect(Array.isArray(oOs?.[cChave]), cChave).toBe(true);
         expect(oOs?.[cChave]).toEqual([]);
      }
      expect(oOs?.mAbasOrdem).toEqual(['checklist', 'fotos', 'servicos', 'pecas']);
   });

   test('CT-API-03 — Fotos da O.S. com sessão devolve as fotos por fase', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_COM_ITENS);
      const cUrl = `${cUrlDetalhe(C_TOKEN_OS_COM_ITENS)}/fotos`;
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-03', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const mFases =
         (oCorpo.oDados as {mFotosPorFase?: Array<{mFotos?: unknown[]}>} | undefined)?.mFotosPorFase ?? [];
      expect(mFases.some((oFase) => (oFase.mFotos?.length ?? 0) > 0)).toBe(true);
   });

   test('CT-API-04 — Detalhe da O.S. sem sessão é recusado', async ({request}, testInfo) => {
      const cUrl = cUrlDetalhe(C_TOKEN_OS_COM_ITENS);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-04', cUrl);
      expect(nStatus, cTexto).toBe(401);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe('Sessão não autenticada');
      expect(oOrdemServicoDe(oCorpo)).toBeUndefined();
   });

   test('CT-API-05 — Detalhe de O.S. que não é da sessão é recusado', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = cUrlDetalhe(C_TOKEN_OS_OUTRA);
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-05', cUrl);
      expect(nStatus, cTexto).toBe(403);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_ACESSO_NEGADO);
      expect(oOrdemServicoDe(oCorpo)).toBeUndefined();
   });

   test('CT-API-06 — O.S. sem fotos devolve lista de fases vazia', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = `${cUrlDetalhe(C_TOKEN_OS_SEM_ITENS)}/fotos`;
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-06', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const mFases = mFotosPorFaseDe(oCorpo);
      expect(Array.isArray(mFases), 'mFotosPorFase').toBe(true);
      expect(mFases).toEqual([]);
   });

   test('CT-API-07 — Fotos da O.S. sem sessão são recusadas', async ({request}, testInfo) => {
      const cUrl = `${cUrlDetalhe(C_TOKEN_OS_COM_ITENS)}/fotos`;
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-07', cUrl);
      expect(nStatus, cTexto).toBe(401);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe('Sessão não autenticada');
      expect(mFotosPorFaseDe(oCorpo)).toBeUndefined();
   });

   test('CT-API-08 — Fotos de O.S. que não é da sessão são recusadas', async ({request}, testInfo) => {
      const cCookie = await obterCookiePortalSessao(request, C_TOKEN_OS_SEM_ITENS);
      const cUrl = `${cUrlDetalhe(C_TOKEN_OS_OUTRA)}/fotos`;
      const oRes = await request.get(cUrl, {headers: cookieHeaderDe(cCookie)});
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-08', cUrl);
      expect(nStatus, cTexto).toBe(403);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe(C_MENSAGEM_ACESSO_NEGADO);
      expect(mFotosPorFaseDe(oCorpo)).toBeUndefined();
   });
});
