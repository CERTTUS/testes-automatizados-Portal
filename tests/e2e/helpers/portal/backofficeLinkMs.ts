import type {APIRequestContext} from '@playwright/test';
import {cEnv} from '../env';

/**
 * Chamadas ao microsserviço exatamente como o BackOffice (F_PortalClienteLinkEmitir / Revogar) as faz:
 * header `chaveapi` e corpo `{cDatabase, cEmpresa, cOrdemServico, cSerie[, cTelefone]}`.
 * A chave vem só de PORTAL_BO_MS_CHAVEAPI (nunca é impressa nem gravada).
 */

export const C_MS_URL = cEnv('PORTAL_BO_MS_URL', 'http://127.0.0.1:8085/api/v1/servicos').replace(/\/+$/, '');
export const C_DATABASE = cEnv('PORTAL_BO_MS_DATABASE', 'PORTALDOCLIENTE');
export const C_EMPRESA = cEnv('PORTAL_BO_EMPRESA', '0001');
export const C_SERIE = 'SR';
export const C_TELEFONE_A = '5546991178665';
export const C_TELEFONE_B = '5546991064223';

export type oRespostaMs = {
   nStatus: number;
   oBody: any;
   cTexto: string;
   cUrl: string;
};

export type oOpcoesLink = {
   cOrdemServico?: string;
   cTelefone?: string;
   cEmpresa?: string;
   cDatabase?: string;
   cSerie?: string;
   cChave?: string;
};

export function lChaveConfigurada(): boolean {
   return cEnv('PORTAL_BO_MS_CHAVEAPI') !== '';
}

function oHeaders(cChave?: string): Record<string, string> {
   return {'content-type': 'application/json', chaveapi: cChave ?? cEnv('PORTAL_BO_MS_CHAVEAPI')};
}

async function oResposta(oRes: {status(): number; text(): Promise<string>; url(): string}): Promise<oRespostaMs> {
   const cTexto = await oRes.text();
   let oBody: any = null;
   try {
      oBody = JSON.parse(cTexto);
   } catch {
      oBody = null;
   }
   return {nStatus: oRes.status(), oBody, cTexto, cUrl: oRes.url()};
}

export async function linkEmitir(oRequest: APIRequestContext, oOpcoes: oOpcoesLink): Promise<oRespostaMs> {
   const oData: Record<string, string> = {
      cDatabase: oOpcoes.cDatabase ?? C_DATABASE,
      cEmpresa: oOpcoes.cEmpresa ?? C_EMPRESA,
      cOrdemServico: oOpcoes.cOrdemServico ?? '',
      cSerie: oOpcoes.cSerie ?? C_SERIE,
   };
   if (oOpcoes.cTelefone !== undefined) {
      oData.cTelefone = oOpcoes.cTelefone;
   }
   const oRes = await oRequest.post(`${C_MS_URL}/portal/link`, {headers: oHeaders(oOpcoes.cChave), data: oData});
   return oResposta(oRes);
}

export async function linkRevogar(oRequest: APIRequestContext, oOpcoes: oOpcoesLink): Promise<oRespostaMs> {
   const oData: Record<string, string> = {
      cDatabase: oOpcoes.cDatabase ?? C_DATABASE,
      cEmpresa: oOpcoes.cEmpresa ?? C_EMPRESA,
      cSerie: oOpcoes.cSerie ?? C_SERIE,
   };
   if (oOpcoes.cOrdemServico !== undefined) {
      oData.cOrdemServico = oOpcoes.cOrdemServico;
   }
   const oRes = await oRequest.post(`${C_MS_URL}/portal/link/revogar`, {headers: oHeaders(oOpcoes.cChave), data: oData});
   return oResposta(oRes);
}

export async function linkLandingMs(
   oRequest: APIRequestContext,
   cToken: string,
   cChave?: string,
): Promise<oRespostaMs> {
   const oRes = await oRequest.get(`${C_MS_URL}/portal/link/${encodeURIComponent(cToken)}`, {
      headers: oHeaders(cChave),
   });
   return oResposta(oRes);
}
