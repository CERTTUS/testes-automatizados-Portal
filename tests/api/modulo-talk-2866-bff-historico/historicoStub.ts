import {expect, type APIRequestContext} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';

export const C_TOKEN_SESSAO = 'tokSessaoHist2880Ok';
export const C_TOKEN_SESSAO_422 = 'tokSessaoHist2880Off';
export const C_TOKEN_ALVO_OK = 'tokAlvoHist2880Ok';
export const C_TOKEN_ALVO_NEGADO = 'tokAlvoHist2880Negado';
export const C_TOKEN_ALVO_REVOGADO = 'tokAlvoHist2880Revogado';
export const C_TOKEN_LINK_FAVICON = 'tokLinkHist2880Favicon';
export const C_TOKEN_LINK_SEM_FAVICON = 'tokLinkHist2880SemFavicon';
export const C_TELEFONE = '5511999990000';
export const C_FAVICON_URL = 'https://cdn.example.com/oficina/favicon.png';

export const C_STUB_MS_URL = (process.env.QA_STUB_MS_URL || 'http://127.0.0.1:18881').replace(
   /\/+$/,
   '',
);

export type oRequisicaoStub = {
   cMetodo: string;
   cPath: string;
   oHeaders: Record<string, string>;
};

export async function stubRequisicoesLimpar(request: APIRequestContext): Promise<void> {
   await request.delete(`${C_STUB_MS_URL}/__stub/requisicoes`);
}

export async function stubRequisicoesObter(
   request: APIRequestContext,
): Promise<Array<{cMetodo: string; cPath: string; oHeaders: Record<string, string>}>> {
   const oRes = await request.get(`${C_STUB_MS_URL}/__stub/requisicoes`);
   const oCorpo = (await oRes.json()) as {mRequisicoes: oRequisicaoStub[]};
   return oCorpo.mRequisicoes;
}

export async function sessaoCriar(
   playwright: typeof import('@playwright/test').request,
   cToken: string,
): Promise<APIRequestContext> {
   const oCtx = await playwright.newContext({baseURL: E2E_API_BASE_URL});
   const oRes = await oCtx.post('/acesso/telefone', {
      data: {cToken, cTelefone: C_TELEFONE},
   });
   expect(oRes.status()).toBe(200);
   return oCtx;
}
