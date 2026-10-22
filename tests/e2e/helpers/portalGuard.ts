import fs from 'node:fs';
import path from 'node:path';
import {cEnv} from './env';

/**
 * Guardrails do módulo portal-link-409-ctoken (URG-10463 / URG-10835).
 * Funções puras (lançam Error) — usáveis no setup, nos helpers HTTP e nos specs.
 * Nunca recebem nem imprimem chaveapi / service key / token.
 */

export class GuardaPortalErro extends Error {
   constructor(cMensagem: string) {
      super(`[guarda portal-link-409] ${cMensagem}`);
      this.name = 'GuardaPortalErro';
   }
}

export const EMPRESA_PERMITIDA = '0001';
export const DATABASE_PERMITIDO = 'portaldocliente';

/** Telefones fictícios (massa-local.md). `123` é o inválido do CT-API-05 (rejeitado antes de qualquer gravação). */
export const TELEFONES_PERMITIDOS = ['11999990001', '11999990002', '47999990001', '123'] as const;

/** Unico numero real aceito: o celular do proprio QA (PORTAL_TELEFONE_QA_REAL). Qualquer outro real e rejeitado. */
export function telefoneQaReal(): string {
   return (cEnv('PORTAL_TELEFONE_QA_REAL') || '').replace(/\D/g, '');
}

const HOSTS_LOCAIS = ['localhost', '127.0.0.1'];

/**
 * Registro das OS criadas pelo próprio teste (.portal-state/os-criadas/<runId>/<spec>.json).
 * É a ÚNICA fonte de "OS permitida": o teste nunca escreve (emitir/revogar link) em OS que não criou.
 * O runId é definido em playwright.config.ts (PORTAL_RUN_ID) e herdado pelos workers; assim uma OS de
 * uma execução anterior (ou criada por outra pessoa/ferramenta) NÃO é aceita pela guarda.
 */
export interface OsCriadaRegistro {
   runId: string;
   spec: string;
   database: string;
   empresa: string;
   ordemServico: string;
   serie: string;
   /** Telefone fictício gravado na OS (clienteCelular) e usado nas emissões. */
   telefone: string;
   criadaEm: string;
   /** Descrição do cliente (sem cadastro) / observação usada para identificar a OS de QA no ERP. */
   marcador: string;
   /** pendente = OS segue aberta no ERP (sem cancelamento automático); link-revogado = link encerrado no afterAll. */
   encerramento: 'pendente' | 'link-revogado';
}

export const C_DIR_ESTADO = path.resolve(process.cwd(), '.portal-state');

export function runIdAtual(): string {
   const cRunId = cEnv('PORTAL_RUN_ID');
   if (!cRunId) {
      throw new GuardaPortalErro('PORTAL_RUN_ID ausente (definido em playwright.config.ts). Rode pelo Playwright.');
   }
   return cRunId;
}

function dirRegistroRun(): string {
   return path.join(C_DIR_ESTADO, 'os-criadas', runIdAtual());
}

function arquivoRegistro(cSpec: string): string {
   return path.join(dirRegistroRun(), `${cSpec.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
}

export function registrarOsCriada(oReg: OsCriadaRegistro): void {
   fs.mkdirSync(dirRegistroRun(), {recursive: true});
   fs.writeFileSync(arquivoRegistro(oReg.spec), JSON.stringify(oReg, null, 2));
}

export function lerRegistroOsDoSpec(cSpec: string): OsCriadaRegistro | null {
   const cArq = arquivoRegistro(cSpec);
   return fs.existsSync(cArq) ? (JSON.parse(fs.readFileSync(cArq, 'utf8')) as OsCriadaRegistro) : null;
}

export function listarOsCriadasDoRun(): OsCriadaRegistro[] {
   const cDir = dirRegistroRun();
   if (!fs.existsSync(cDir)) {
      return [];
   }
   return fs
      .readdirSync(cDir)
      .filter((cNome) => cNome.endsWith('.json'))
      .map((cNome) => JSON.parse(fs.readFileSync(path.join(cDir, cNome), 'utf8')) as OsCriadaRegistro);
}

export function atualizarEncerramentoOs(cSpec: string, cEncerramento: OsCriadaRegistro['encerramento']): void {
   const oReg = lerRegistroOsDoSpec(cSpec);
   if (oReg) {
      registrarOsCriada({...oReg, encerramento: cEncerramento});
   }
}

/** True quando (empresa, OS) consta no registro da execução atual, isto é, foi criada por este teste. */
export function osCriadaPeloTeste(cEmpresa: string, cOrdemServico: string): boolean {
   return listarOsCriadasDoRun().some((oReg) => oReg.empresa === cEmpresa && oReg.ordemServico === cOrdemServico);
}

function urlParse(cUrl: string, cRotulo: string): URL {
   try {
      return new URL(cUrl);
   } catch {
      throw new GuardaPortalErro(`${cRotulo} não é uma URL válida.`);
   }
}

/** PORTAL_TEST_DB_URL: só Postgres em localhost/127.0.0.1 e banco `portaldocliente`. */
export function urlBancoTesteValidada(): string {
   const cUrl = cEnv('PORTAL_TEST_DB_URL');
   if (!cUrl) {
      throw new GuardaPortalErro(
         'PORTAL_TEST_DB_URL ausente. Defina no .env.local: postgresql://<usuario>:<senha>@localhost:5432/portaldocliente (ver .env.example).',
      );
   }
   const oUrl = urlParse(cUrl, 'PORTAL_TEST_DB_URL');
   const cBanco = oUrl.pathname.replace(/^\/+/, '');
   if (!/^postgres(ql)?:$/.test(oUrl.protocol)) {
      throw new GuardaPortalErro('PORTAL_TEST_DB_URL deve usar o protocolo postgresql://.');
   }
   if (!HOSTS_LOCAIS.includes(oUrl.hostname)) {
      throw new GuardaPortalErro(
         `PORTAL_TEST_DB_URL recusada: host "${oUrl.hostname}" não é local (permitido: ${HOSTS_LOCAIS.join(', ')}).`,
      );
   }
   if (cBanco !== DATABASE_PERMITIDO) {
      throw new GuardaPortalErro(
         `PORTAL_TEST_DB_URL recusada: banco "${cBanco}" diferente de "${DATABASE_PERMITIDO}".`,
      );
   }
   return cUrl;
}

/** A API sob teste (PORTAL_MS_BASE_URL) precisa ser local — a suíte nunca aponta para ambiente remoto. */
export function exigirApiLocal(cBaseUrl: string): void {
   const oUrl = urlParse(cBaseUrl, 'PORTAL_MS_BASE_URL');
   if (!HOSTS_LOCAIS.includes(oUrl.hostname)) {
      throw new GuardaPortalErro(
         `PORTAL_MS_BASE_URL recusada: host "${oUrl.hostname}" não é local (permitido: ${HOSTS_LOCAIS.join(', ')}).`,
      );
   }
}

export type AmbienteSupabase = 'prod' | 'dev';

/** PORTAL_MS_SUPABASE_ENV: ausente é tratado como prod (fail-safe). */
export function ambienteSupabase(): AmbienteSupabase {
   const cBruto = cEnv('PORTAL_MS_SUPABASE_ENV', 'prod').toLowerCase();
   if (cBruto !== 'prod' && cBruto !== 'dev') {
      throw new GuardaPortalErro(`PORTAL_MS_SUPABASE_ENV inválido ("${cBruto}"). Use prod ou dev.`);
   }
   return cBruto;
}

/**
 * Gravar no Supabase de PRODUÇÃO (ou ambiente não declarado) exige opt-in explícito
 * PORTAL_ALLOW_PROD_WRITE=1, além dos guardrails de massa. Em `dev` não exige.
 */
export function exigirOptInSupabase(): void {
   if (ambienteSupabase() === 'dev') {
      return;
   }
   if (cEnv('PORTAL_ALLOW_PROD_WRITE') !== '1') {
      throw new GuardaPortalErro(
         'Supabase em PRODUÇÃO (PORTAL_MS_SUPABASE_ENV=prod ou ausente): escrita bloqueada. ' +
            'Para autorizar conscientemente, exporte PORTAL_ALLOW_PROD_WRITE=1 na sessão do terminal ' +
            '(não grave no .env.local). Alternativa: apontar a API para um Supabase dev e definir PORTAL_MS_SUPABASE_ENV=dev.',
      );
   }
}

export interface AlvoEscrita {
   cDatabase: string;
   cEmpresa: string;
   cOrdemServico: string;
   cTelefone?: string;
}

/** Valida empresa, banco, "OS criada pelo próprio teste", telefone fictício e o opt-in do Supabase antes de emitir/revogar. */
export function exigirEscritaPermitida(oAlvo: AlvoEscrita): void {
   if (oAlvo.cEmpresa !== EMPRESA_PERMITIDA) {
      throw new GuardaPortalErro(`empresa "${oAlvo.cEmpresa}" recusada (só ${EMPRESA_PERMITIDA}).`);
   }
   if (oAlvo.cDatabase.toLowerCase() !== DATABASE_PERMITIDO) {
      throw new GuardaPortalErro(`cDatabase "${oAlvo.cDatabase}" recusado (só ${DATABASE_PERMITIDO}).`);
   }
   if (!osCriadaPeloTeste(oAlvo.cEmpresa, oAlvo.cOrdemServico)) {
      throw new GuardaPortalErro(
         `OS "${oAlvo.cOrdemServico}" não consta no registro de OS criadas por este teste (execução ${runIdAtual()}). ` +
            'A suíte só escreve em OS que ela mesma criou.',
      );
   }
   if (oAlvo.cTelefone !== undefined) {
      const cDigitos = oAlvo.cTelefone.replace(/\D/g, '');
      if (!(TELEFONES_PERMITIDOS as readonly string[]).includes(cDigitos) && !(telefoneQaReal() && cDigitos === telefoneQaReal())) {
         throw new GuardaPortalErro('telefone fora da massa fictícia permitida (massa-local.md).');
      }
   }
   exigirOptInSupabase();
}
