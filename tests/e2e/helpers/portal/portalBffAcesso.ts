import type {APIRequestContext} from '@playwright/test';
import {cEnv} from '../env';

/** Chamadas ao BFF do Portal (portalcliente-api). Use um APIRequestContext isolado por cenário (cookies). */

export const C_BFF_URL = cEnv('PORTAL_BO_BFF_URL', 'http://127.0.0.1:3333').replace(/\/+$/, '');
export const C_WEB_URL = cEnv('PORTAL_BO_WEB_URL', 'http://127.0.0.1:3000').replace(/\/+$/, '');

export type oRespostaBff = {nStatus: number; oBody: any; cTexto: string; cUrl: string; lCookieSessao: boolean};

async function oResposta(oRes: {
   status(): number;
   text(): Promise<string>;
   url(): string;
   headersArray(): {name: string; value: string}[];
}): Promise<oRespostaBff> {
   const cTexto = await oRes.text();
   let oBody: any = null;
   try {
      oBody = JSON.parse(cTexto);
   } catch {
      oBody = null;
   }
   const lCookieSessao = oRes
      .headersArray()
      .some((oH) => oH.name.toLowerCase() === 'set-cookie' && /(^|\s|;)portal_sessao=[^;\s]+/.test(oH.value));
   return {nStatus: oRes.status(), oBody, cTexto, cUrl: oRes.url(), lCookieSessao};
}

export async function landingBff(oRequest: APIRequestContext, cToken: string): Promise<oRespostaBff> {
   return oResposta(await oRequest.get(`${C_BFF_URL}/portal/${encodeURIComponent(cToken)}`));
}

/** Retorna status + se o Set-Cookie trouxe `portal_sessao` com valor. O contexto guarda o cookie para as chamadas seguintes. */
export async function acessoTelefone(
   oRequest: APIRequestContext,
   cToken: string,
   cTelefone: string,
): Promise<oRespostaBff> {
   return oResposta(await oRequest.post(`${C_BFF_URL}/acesso/telefone`, {data: {cToken, cTelefone}}));
}

export async function osListar(oRequest: APIRequestContext): Promise<oRespostaBff> {
   return oResposta(await oRequest.get(`${C_BFF_URL}/cliente/os`));
}

/** Histórico do cliente (itens com cOsPublicId/cNumeroOs), usado para achar o id público da OS. */
export async function historicoListar(oRequest: APIRequestContext): Promise<oRespostaBff> {
   return oResposta(await oRequest.get(`${C_BFF_URL}/cliente/historico`));
}

export async function osDetalhe(oRequest: APIRequestContext, cOsPublicId: string): Promise<oRespostaBff> {
   return oResposta(await oRequest.get(`${C_BFF_URL}/cliente/os/${encodeURIComponent(cOsPublicId)}`));
}
