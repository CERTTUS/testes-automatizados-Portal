import {expect, type APIRequestContext} from '@playwright/test';
import {cEnv} from '../env';
import {empresaPortal2881, lHomologPortal, telefonePortal2881} from './massaPortal2881';

/**
 * Massa de links do Portal no servidor de teste (TALK-2866) — emite e revoga links no MS de teste
 * só para a OS de teste configurada no .env.local:
 *   PORTAL_OS_HISTORICO_HOMOLOG / PORTAL_OS_HISTORICO_SERIE_HOMOLOG — outra OS do mesmo cliente da OS do link
 *   PORTAL_MS_HOMOLOG_CHAVEAPI — chave do MS de teste com portal.link.emitir/revogar
 * No fim, `restaurar` revoga o link ativo que a massa deixou (a OS termina sem link ativo).
 */

const C_MS_HOMOLOG_URL = cEnv('PORTAL_MS_HOMOLOG_URL', 'http://34.195.122.141:8085/api/v1/servicos').replace(
   /\/+$/,
   '',
);

export type oMassaLinksHomolog = {
   /** Link emitido e revogado na OS de teste (CT-API-08). */
   cTokenRevogado: string;
   /** Link ativo na OS de teste, alvo do histórico (CT-API-10, 14..17). */
   cTokenAlvo: string;
   restaurar: () => Promise<void>;
};

type oOsTeste = {cDatabase: string; cEmpresa: string; cOrdemServico: string; cSerie: string};

function oOsTesteConfigurada(): oOsTeste {
   const cOrdemServico = cEnv('PORTAL_OS_HISTORICO_HOMOLOG');
   const cSerie = cEnv('PORTAL_OS_HISTORICO_SERIE_HOMOLOG');
   expect(
      cOrdemServico,
      'massa: defina PORTAL_OS_HISTORICO_HOMOLOG (outra OS do mesmo cliente da OS do link) no .env.local',
   ).not.toBe('');
   expect(cSerie, 'massa: defina PORTAL_OS_HISTORICO_SERIE_HOMOLOG no .env.local').not.toBe('');
   return {
      cDatabase: cEnv('PORTAL_MS_HOMOLOG_DATABASE', 'iberia'),
      cEmpresa: empresaPortal2881(),
      cOrdemServico,
      cSerie,
   };
}

function oHeadersMs(): Record<string, string> {
   const cChave = cEnv('PORTAL_MS_HOMOLOG_CHAVEAPI');
   expect(cChave, 'massa: defina PORTAL_MS_HOMOLOG_CHAVEAPI no .env.local').not.toBe('');
   return {'content-type': 'application/json', chaveapi: cChave};
}

function cTelefoneCliente(): string {
   const cDigitos = telefonePortal2881().replace(/\D/g, '');
   return cDigitos.startsWith('55') ? cDigitos : `55${cDigitos}`;
}

async function linkEmitir(request: APIRequestContext, oOs: oOsTeste): Promise<string> {
   const oRes = await request.post(`${C_MS_HOMOLOG_URL}/portal/link`, {
      headers: oHeadersMs(),
      data: {...oOs, cTelefone: cTelefoneCliente()},
   });
   const oCorpo = (await oRes.json().catch(() => ({}))) as {
      cMensagem?: string;
      oDados?: {cToken?: string};
   };
   expect(oRes.status(), `massa: emitir link da OS de teste (${oCorpo.cMensagem ?? ''})`).toBe(200);
   expect(oCorpo.oDados?.cToken, 'massa: token do link emitido').toBeTruthy();
   return oCorpo.oDados!.cToken!;
}

async function linkRevogar(request: APIRequestContext, cToken: string): Promise<void> {
   const oRes = await request.post(`${C_MS_HOMOLOG_URL}/portal/link/revogar`, {
      headers: oHeadersMs(),
      data: {cToken},
   });
   expect(oRes.status(), 'massa: revogar link da OS de teste').toBe(200);
}

/**
 * Homolog: emite + revoga (link revogado) e emite de novo (link ativo do histórico) na OS de teste.
 * Fora de homolog: não deve ser chamada (o stub local já traz essa massa).
 */
export async function massaLinksHomologPreparar(
   request: APIRequestContext,
): Promise<oMassaLinksHomolog> {
   expect(lHomologPortal(), 'massa de links só existe no modo homolog').toBe(true);
   const oOs = oOsTesteConfigurada();
   const cTokenRevogado = await linkEmitir(request, oOs);
   await linkRevogar(request, cTokenRevogado);
   const cTokenAlvo = await linkEmitir(request, oOs);
   expect(cTokenAlvo, 'nova emissão após revogar deve gerar outro token').not.toBe(cTokenRevogado);
   return {
      cTokenRevogado,
      cTokenAlvo,
      restaurar: async () => {
         await linkRevogar(request, cTokenAlvo);
      },
   };
}
