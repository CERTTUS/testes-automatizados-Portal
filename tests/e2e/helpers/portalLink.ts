import {expect} from '@playwright/test';
import type {APIRequestContext, APIResponse, TestInfo} from '@playwright/test';
import {cEnv} from './env';
import {exigirApiLocal, exigirEscritaPermitida} from './portalGuard';
import {evidenciarApiPreCr} from './pre-cr/evidenciarApiPreCr';

/**
 * Helpers HTTP do microserviço (api-microservicos) — POST /servicos/portal/link.
 * A chave `chaveapi` vem SEMPRE de env (PORTAL_MS_CHAVEAPI); nunca em código/log/artefato.
 * A OS usada vem de portalMassaOs.ts (criada pelo próprio spec); as guardas recusam qualquer outra.
 */

export const PORTAL_MS_BASE_URL = cEnv('PORTAL_MS_BASE_URL', 'http://localhost:8085/api/v1/servicos').replace(
   /\/+$/,
   '',
);
export const PORTAL_MS_DATABASE = cEnv('PORTAL_MS_DATABASE', 'portaldocliente');
export const PORTAL_MS_EMPRESA = cEnv('PORTAL_MS_EMPRESA', '0001');
export const PORTAL_MS_SERIE = cEnv('PORTAL_MS_SERIE', 'SR');

/** Telefones fictícios válidos (BR) — massa-local.md. */
/**
 * Telefone A: por padrao ficticio. Se PORTAL_TELEFONE_QA_REAL estiver definido (.env.local, gitignored), e o
 * celular REAL do QA (unico numero real permitido; recebe os WhatsApps enviados ao criar a OS pela api-mobile).
 */
export const TELEFONE_A = (cEnv('PORTAL_TELEFONE_QA_REAL') || '').replace(/\D/g, '') || '11999990001';
export const TELEFONE_B = '11999990002';
export const TELEFONE_INVALIDO = '123';

export interface CorpoEmissao {
   cDatabase: string;
   cEmpresa: string;
   cOrdemServico: string;
   cSerie: string;
   cTelefone?: string;
}

export interface RespostaPortal {
   lSucesso?: boolean;
   cMensagem?: string;
   oDados?: {cToken?: string; lHashAtualizado?: boolean};
}

export function cChaveApi(): string {
   return cEnv('PORTAL_MS_CHAVEAPI');
}

export function exigirChaveApi(): void {
   // Falha explícita (sem skip) quando a massa/env não está pronta.
   expect(cChaveApi(), 'PORTAL_MS_CHAVEAPI ausente no .env.local').not.toBe('');
}

function oHeaders(lComChave: boolean): Record<string, string> {
   const oH: Record<string, string> = {'Content-Type': 'application/json'};
   if (lComChave) {
      oH.chaveapi = cChaveApi();
   }
   return oH;
}

export function montarCorpo(cOrdemServico: string, cTelefone?: string): CorpoEmissao {
   const oCorpo: CorpoEmissao = {
      cDatabase: PORTAL_MS_DATABASE,
      cEmpresa: PORTAL_MS_EMPRESA,
      cOrdemServico,
      cSerie: PORTAL_MS_SERIE,
   };
   if (cTelefone !== undefined) {
      oCorpo.cTelefone = cTelefone;
   }
   return oCorpo;
}

export async function emitirLink(
   request: APIRequestContext,
   oCorpo: CorpoEmissao,
   lComChave = true,
): Promise<APIResponse> {
   // Guardas antes de qualquer escrita: API local, massa permitida e opt-in do Supabase.
   exigirApiLocal(PORTAL_MS_BASE_URL);
   exigirEscritaPermitida(oCorpo);
   return request.post(`${PORTAL_MS_BASE_URL}/portal/link`, {
      headers: oHeaders(lComChave),
      data: oCorpo,
   });
}

export async function lerJson(oRes: APIResponse): Promise<RespostaPortal> {
   return (await oRes.json()) as RespostaPortal;
}

/** Revoga o link ativo da OS e devolve o status HTTP (sem asserção). Guardas: só OS criada pelo teste. */
export async function revogarLinkStatus(request: APIRequestContext, cOrdemServico: string): Promise<number> {
   exigirApiLocal(PORTAL_MS_BASE_URL);
   exigirEscritaPermitida({cDatabase: PORTAL_MS_DATABASE, cEmpresa: PORTAL_MS_EMPRESA, cOrdemServico});
   const oRes = await request.post(`${PORTAL_MS_BASE_URL}/portal/link/revogar`, {
      headers: oHeaders(true),
      data: {
         cDatabase: PORTAL_MS_DATABASE,
         cEmpresa: PORTAL_MS_EMPRESA,
         cOrdemServico,
         cSerie: PORTAL_MS_SERIE,
      },
   });
   return oRes.status();
}

/** Revoga o link ativo da OS. 200 (revogado/já revogado) ou 404 (sem link ativo) são limpeza válida. */
export async function revogarLinkDaOs(request: APIRequestContext, cOrdemServico: string): Promise<number> {
   const nStatus = await revogarLinkStatus(request, cOrdemServico);
   expect([200, 404], `limpeza da OS ${cOrdemServico} (revogar) retornou ${nStatus}`).toContain(nStatus);
   return nStatus;
}

/**
 * Garante que a OS não tinha link ativo. Obs.: revogar um link ativo retorna 200 e o revoga
 * (limpeza); por isso 200 aqui significa que o CT criou link indevidamente.
 */
export async function esperarSemLinkAtivo(request: APIRequestContext, cOrdemServico: string): Promise<void> {
   const nStatus = await revogarLinkDaOs(request, cOrdemServico);
   expect(nStatus, 'não deveria existir link ativo para a OS').toBe(404);
}

function mascararTokens(cTexto: string): string {
   return cTexto.replace(/("cToken"\s*:\s*")([^"]{4})[^"]*(")/g, '$1$2***$3');
}

/**
 * Evidência de CT-API (rule qa-evidencia-por-modalidade): JSON da resposta (cToken mascarado) +
 * `{CT}-resumo.md` (status, endpoint, 1 frase do que prova), anexados ao relatório e, com PRE_CR=1,
 * gravados na run. Chamar após as asserções (só PASS gera prova).
 */
export async function registrarEvidenciaApi(
   testInfo: TestInfo,
   cCt: string,
   oRes: APIResponse,
   cProva: string,
): Promise<void> {
   const cEndpoint = `POST ${new URL(oRes.url()).pathname}`;
   const cCorpo = mascararTokens(await oRes.text());
   let oCorpo: unknown = cCorpo;
   try {
      oCorpo = JSON.parse(cCorpo);
   } catch {
      /* corpo não-JSON: mantém texto */
   }
   await testInfo.attach(`${cCt}-response.json`, {
      body: JSON.stringify({status: oRes.status(), endpoint: cEndpoint, body: oCorpo}, null, 2),
      contentType: 'application/json',
   });
   await testInfo.attach(`${cCt}-resumo.md`, {
      body: `# ${cCt}\n\n- **HTTP:** ${oRes.status()}\n- **Endpoint:** ${cEndpoint}\n- **Prova:** ${cProva}\n`,
      contentType: 'text/markdown',
   });
   await evidenciarApiPreCr(testInfo, cCt, oRes.status(), cEndpoint, cCorpo);
}
