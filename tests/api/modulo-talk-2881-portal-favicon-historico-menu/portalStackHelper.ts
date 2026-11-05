import {expect, type APIRequestContext} from '@playwright/test';
import {cEnv, E2E_BASE_URL} from '../../e2e/helpers/env';
import {
   lHomologPortal,
   telefonePortal2881,
   tokenPortal2881,
} from '../../e2e/helpers/portal/massaPortal2881';
import {
   C_TELEFONE,
   C_TOKEN_LINK_FAVICON,
   C_TOKEN_SESSAO,
} from '../modulo-talk-2866-bff-historico/historicoStub';

export {
   C_FAVICON_URL,
   C_TELEFONE,
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
} from '../modulo-talk-2866-bff-historico/historicoStub';

export const C_TOKEN_LINK_LOGO = 'tokLinkHist2880LogoOnly';
export const C_TOKEN_LINK_REVOGADO = 'tokLinkHist2880Revogado';
export const C_TOKEN_LINK_SEM_CAMPO = 'tokLinkHist2880SemCampo';
export const C_LOGO_URL = 'https://cdn.example.com/oficina/logo.png';
export const C_TOKEN_INEXISTENTE = 'tokLinkHist2880NaoExiste';
export const C_UA_WHATSAPP = 'WhatsApp/2.23.20.0 A';
export const C_NOME_OFICINA = 'Oficina Histórico';

/** Preview GET /{token}: homolog usa o token real; local usa stub de MS. */
export function tokenPreviewValido(): string {
   if (!lHomologPortal()) {
      return C_TOKEN_LINK_FAVICON;
   }
   const cToken = tokenPortal2881();
   expect(cToken, 'PORTAL_TOKEN_HOMOLOG precisa estar no .env.local').not.toBe('');
   return cToken;
}

/** CT-API-04: homolog reusa o token real após PATCH sem campo favicon; local usa stub. */
export function tokenPreviewSemCampo(): string {
   if (!lHomologPortal()) {
      return C_TOKEN_LINK_SEM_CAMPO;
   }
   return tokenPreviewValido();
}

/** Sessão dos CTs de histórico/Meus dados: homolog usa o link real; local usa stub de MS. */
export function tokenSessaoPortal(): string {
   return lHomologPortal() ? tokenPreviewValido() : C_TOKEN_SESSAO;
}

/** CT-API-08: homolog precisa de um link revogado real (PORTAL_TOKEN_REVOGADO_HOMOLOG). */
export function tokenRevogadoPreview(): string {
   return lHomologPortal() ? cEnv('PORTAL_TOKEN_REVOGADO_HOMOLOG') : C_TOKEN_LINK_REVOGADO;
}

/** Celular do login: homolog usa o da OS real (com DDI 55); local usa o do stub. */
function telefoneSessaoWeb(): string {
   if (!lHomologPortal()) {
      return C_TELEFONE;
   }
   const cDigitos = telefonePortal2881().replace(/\D/g, '');
   return cDigitos.startsWith('55') ? cDigitos : `55${cDigitos}`;
}

export async function sessaoWebCriar(
   playwright: typeof import('@playwright/test').request,
   cToken: string,
): Promise<APIRequestContext> {
   const oCtx = await playwright.newContext({baseURL: E2E_BASE_URL});
   const oRes = await oCtx.post('/api/bff/acesso/telefone', {
      data: {cToken, cTelefone: telefoneSessaoWeb()},
   });
   expect(oRes.status()).toBe(200);
   return oCtx;
}

function oAtributosTag(cAttrs: string): Record<string, string> {
   const oSaida: Record<string, string> = {};
   const oRegex = /([^\s=]+)\s*=\s*["']([^"']*)["']/g;
   let oMatch: RegExpExecArray | null;
   while ((oMatch = oRegex.exec(cAttrs))) {
      oSaida[oMatch[1].toLowerCase()] = oMatch[2];
   }
   return oSaida;
}

function cDecodificarAmp(cValor: string): string {
   return cValor.replace(/&amp;/g, '&');
}

export function metaConteudo(
   cHtml: string,
   cAtributo: 'property' | 'name',
   cValor: string,
): string | null {
   const oRegex = /<meta\s+([^>]+)>/gi;
   let oMatch: RegExpExecArray | null;
   while ((oMatch = oRegex.exec(cHtml))) {
      const oAttrs = oAtributosTag(oMatch[1]);
      if (oAttrs[cAtributo] === cValor && oAttrs.content !== undefined) {
         return cDecodificarAmp(oAttrs.content);
      }
   }
   return null;
}

export function linksIcone(cHtml: string): string[] {
   const mHrefs: string[] = [];
   const oRegex = /<link\s+([^>]+)>/gi;
   let oMatch: RegExpExecArray | null;
   while ((oMatch = oRegex.exec(cHtml))) {
      const oAttrs = oAtributosTag(oMatch[1]);
      const mRels = (oAttrs.rel || '').toLowerCase().split(/\s+/);
      if (mRels.includes('icon') || mRels.includes('apple-touch-icon')) {
         if (oAttrs.href) {
            mHrefs.push(cDecodificarAmp(oAttrs.href));
         }
      }
   }
   return mHrefs;
}

export function tituloHtml(cHtml: string): string | null {
   const oMatch = cHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
   return oMatch ? oMatch[1].trim() : null;
}
