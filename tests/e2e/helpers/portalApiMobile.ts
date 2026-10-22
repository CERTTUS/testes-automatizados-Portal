import pg from 'pg';
import {cEnv} from './env';
import {GuardaPortalErro, exigirApiLocal, urlBancoTesteValidada} from './portalGuard';

/**
 * Cliente HTTP mínimo da api-mobile (Touch) para CRIAR a OS de teste do módulo portal-link-409-ctoken.
 *
 * Decisão (URG-10463): porte TS fino das chamadas HTTP já validadas em
 * teste-automatizado-Touch (test/auxiliares/apiTouchHelper.js: login, GET /operacoes, configuracoes,
 * POST /ordensservico; portalClienteApiHelper.js: padOs/body da OS). Mesmos endpoints, sem importar o
 * código JS do Touch (outro repo, stack WDIO/axios) para não acoplar os dois repositórios.
 *
 * Só HTTP da api-mobile; nenhum acesso direto de escrita ao banco do ERP. Segredos só via env; nunca logados.
 */

export const APIMOBILE_BASE_URL = cEnv('PORTAL_APIMOBILE_BASE', 'http://localhost:8086/api/v1').replace(/\/+$/, '');
const C_DISPOSITIVO_NOME = cEnv('PORTAL_APIMOBILE_DISPOSITIVO_NOME', 'Google sdk_gphone64_x86_64');
const C_SERIE_OS = 'SR';

export interface OsCriadaApiMobile {
   empresa: string;
   ordemServico: string;
   serie: string;
}

export interface MassaOsDescoberta {
   operacao: string;
   /** Código do consumidor final (cliente "sem cadastro", formato 2) — evita usar cliente real. */
   consumidorFinal: string;
   origem: Record<string, 'env' | 'api' | 'omitido'>;
}

/** Pré-requisitos de ambiente (sem rede): falha com mensagem clara e lista exata do que falta. */
export function exigirPreRequisitosCriacaoOs(): void {
   const aFaltando: string[] = [];
   if (cEnv('TOUCH_API_OS_GRAVAR') !== '1') {
      aFaltando.push('TOUCH_API_OS_GRAVAR=1 (exporte na sessão: autoriza gravar OS no banco LOCAL do ERP via api-mobile; não vale para produção)');
   }
   if (!cEnv('PORTAL_APIMOBILE_USUARIO')) {
      aFaltando.push('PORTAL_APIMOBILE_USUARIO (usuário da api-mobile, ex.: o loginTeste do harness-handoff.json)');
   }
   if (!cEnv('PORTAL_APIMOBILE_SENHA')) {
      aFaltando.push('PORTAL_APIMOBILE_SENHA (senha desse usuário; só no .env.local)');
   }
   if (aFaltando.length > 0) {
      throw new GuardaPortalErro(`pré-requisitos para criar a OS de teste ausentes:\n - ${aFaltando.join('\n - ')}`);
   }
   exigirApiLocal(APIMOBILE_BASE_URL);
}

/** A api-mobile precisa responder (qualquer status < 500 em rota autenticada, sem token = 401). */
export async function sondarApiMobile(): Promise<void> {
   try {
      const oRes = await fetch(`${APIMOBILE_BASE_URL}/operacoes`, {signal: AbortSignal.timeout(10_000)});
      if (oRes.status >= 500) {
         throw new Error(`HTTP ${oRes.status}`);
      }
   } catch {
      throw new GuardaPortalErro(
         `api-mobile indisponível em ${APIMOBILE_BASE_URL}. Suba a api-mobile (yarn start:dev, porta API_PORTA do .env dela) ou ajuste PORTAL_APIMOBILE_BASE.`,
      );
   }
}

async function seriaisCandidatos(): Promise<string[]> {
   const aSeriais: string[] = [];
   const cSerialEnv = cEnv('PORTAL_APIMOBILE_DISPOSITIVO_SERIAL');
   if (cSerialEnv) {
      aSeriais.push(cSerialEnv);
   }
   // O tenant permite 1 dispositivo por usuário: reaproveita os seriais JÁ vinculados (SELECT somente leitura).
   const oCli = new pg.Client({connectionString: urlBancoTesteValidada(), connectionTimeoutMillis: 5_000});
   try {
      await oCli.connect();
      const oRes = await oCli.query<{serial: string}>('SELECT trim(serial) AS serial FROM mobiledispositivos');
      aSeriais.push(...oRes.rows.map((oRow) => oRow.serial).filter(Boolean));
   } catch {
      // sem leitura do banco: segue só com o serial do env
   } finally {
      await oCli.end().catch(() => undefined);
   }
   return [...new Set(aSeriais)];
}

export interface SessaoApiMobile {
   headers: Record<string, string>;
}

let oSessaoCache: Promise<SessaoApiMobile> | null = null;

function cabecalhosBase(): Record<string, string> {
   const oH: Record<string, string> = {'Content-Type': 'application/json'};
   const cConexao = cEnv('PORTAL_APIMOBILE_CONEXAO');
   if (cConexao) {
      oH.empresa = cConexao; // só api-mobile NUVEM; em LOCAL é ignorado
   }
   return oH;
}

/** Login (cacheado por processo). Não loga nem expõe senha/token. */
export function loginApiMobile(): Promise<SessaoApiMobile> {
   if (!oSessaoCache) {
      oSessaoCache = (async () => {
         const aSeriais = await seriaisCandidatos();
         if (aSeriais.length === 0) {
            throw new GuardaPortalErro(
               'sem serial de dispositivo para o login da api-mobile. Defina PORTAL_APIMOBILE_DISPOSITIVO_SERIAL (serial já vinculado ao usuário em mobiledispositivos).',
            );
         }
         let cUltimaMensagem = '';
         for (const cSerial of aSeriais) {
            const oRes = await fetch(`${APIMOBILE_BASE_URL}/autenticacao/login`, {
               method: 'POST',
               headers: cabecalhosBase(),
               body: JSON.stringify({
                  usuario: cEnv('PORTAL_APIMOBILE_USUARIO'),
                  senha: cEnv('PORTAL_APIMOBILE_SENHA'),
                  dispositivoNome: C_DISPOSITIVO_NOME,
                  dispositivoSerial: cSerial,
               }),
               signal: AbortSignal.timeout(30_000),
            });
            const oCorpo = (await oRes.json().catch(() => ({}))) as {acessoToken?: string; mensagem?: string};
            if (oRes.status === 200 && oCorpo.acessoToken) {
               return {headers: {...cabecalhosBase(), Authorization: `Bearer ${oCorpo.acessoToken}`}};
            }
            cUltimaMensagem = `HTTP ${oRes.status} ${String(oCorpo.mensagem ?? '').slice(0, 160)}`;
            if (oRes.status !== 403) {
               break; // credencial inválida/erro: tentar outro serial não ajuda
            }
         }
         throw new GuardaPortalErro(
            `login na api-mobile falhou (${cUltimaMensagem}). Confira PORTAL_APIMOBILE_USUARIO/SENHA e se o usuário está vinculado a um dispositivo (defina PORTAL_APIMOBILE_DISPOSITIVO_SERIAL).`,
         );
      })();
      oSessaoCache.catch(() => {
         oSessaoCache = null; // permite nova tentativa em outro spec/worker lógico
      });
   }
   return oSessaoCache;
}

async function getJson<T>(oSessao: SessaoApiMobile, cCaminho: string): Promise<{status: number; data: T}> {
   const oRes = await fetch(`${APIMOBILE_BASE_URL}${cCaminho}`, {
      headers: oSessao.headers,
      signal: AbortSignal.timeout(30_000),
   });
   return {status: oRes.status, data: (await oRes.json().catch(() => ({}))) as T};
}

/**
 * Descobre a massa mínima via GET (nada é gravado):
 *  - operação: env PORTAL_OS_OPERACAO, senão 1ª de GET /operacoes?aberturaOrdemServico=1 (opcional na recepção);
 *  - consumidor final: GET /ordensservico/configuracoes/{empresa} (cliente "sem cadastro", formato 2).
 * Cliente/veículo/mecânica/motor NÃO são necessários na fase Recepção com cliente sem cadastro; só entram se
 * definidos explicitamente em PORTAL_OS_* (ver resumo-implementacao.md).
 */
export async function descobrirMassaOs(oSessao: SessaoApiMobile, cEmpresa: string): Promise<MassaOsDescoberta> {
   const oOrigem: MassaOsDescoberta['origem'] = {};

   let cOperacao = cEnv('PORTAL_OS_OPERACAO');
   if (cOperacao) {
      oOrigem.operacao = 'env';
   } else {
      const oOps = await getJson<{operacoes?: Array<{codigo?: string}>}>(
         oSessao,
         '/operacoes?aberturaOrdemServico=1&pagina=1&limite=20',
      );
      cOperacao = oOps.status === 200 ? String(oOps.data.operacoes?.[0]?.codigo ?? '').trim() : '';
      oOrigem.operacao = cOperacao ? 'api' : 'omitido';
   }

   const oCfg = await getJson<{consumidorFinalCodigo?: string}>(oSessao, `/ordensservico/configuracoes/${cEmpresa}`);
   const cConsumidorFinal = oCfg.status === 200 ? String(oCfg.data.consumidorFinalCodigo ?? '').trim() : '';
   if (!cConsumidorFinal) {
      throw new GuardaPortalErro(
         `empresa ${cEmpresa} sem consumidor final configurado na api-mobile (HTTP ${oCfg.status}); a OS de teste usa cliente sem cadastro. ` +
            'Configure no BackOffice ou defina PORTAL_OS_CLIENTE (cliente cadastrado) para um fluxo alternativo.',
      );
   }
   oOrigem.consumidorFinal = 'api';
   return {operacao: cOperacao, consumidorFinal: cConsumidorFinal, origem: oOrigem};
}

export function padOs(cValor: unknown): string {
   const cDigitos = String(cValor ?? '').replace(/\D/g, '');
   return cDigitos ? cDigitos.padStart(6, '0') : '';
}

/**
 * Cria a OS na Recepção (faseDestino 'D'), cliente SEM cadastro (formato 2) com descrição identificável e
 * celular FICTÍCIO (clienteCelular). Body no mesmo contrato do Touch (montarBodyOsComPeca), sem peças/serviços.
 * Retorna empresa/OS/série reais devolvidos pela api-mobile.
 */
export async function criarOsViaApiMobile(
   oSessao: SessaoApiMobile,
   oMassa: MassaOsDescoberta,
   cEmpresa: string,
   cMarcador: string,
   cTelefone: string,
): Promise<OsCriadaApiMobile> {
   const oBody = {
      empresa: cEmpresa,
      operacao: oMassa.operacao,
      clienteFormatoInformar: 2,
      cliente: '',
      clienteLocal: '',
      clienteDescricao: cMarcador.slice(0, 40),
      clienteCelular: cTelefone,
      mecanica: cEnv('PORTAL_OS_MECANICA'),
      veiculo: cEnv('PORTAL_OS_VEICULO'),
      veiculoCarreta1: '',
      veiculoCarreta2: '',
      veiculoCarreta3: '',
      veiculoMedidorUso: 'Odômetro',
      odometro: 0,
      horimetro: 0,
      motor: cEnv('PORTAL_OS_MOTOR'),
      motorTipo: 1,
      listaPrecoServicos: '',
      numeroBloco: '',
      numeroBombaInjetora: '',
      numeroTurbo: '',
      observacaoInterna: cMarcador,
      checklist: [],
      pecas: [],
      servicos: [],
      faseDestino: 'D',
   };
   const oRes = await fetch(`${APIMOBILE_BASE_URL}/ordensservico`, {
      method: 'POST',
      headers: oSessao.headers,
      body: JSON.stringify(oBody),
      signal: AbortSignal.timeout(60_000),
   });
   const oCorpo = (await oRes.json().catch(() => ({}))) as {empresa?: string; ordemServico?: string; mensagem?: unknown};
   if (oRes.status !== 200 && oRes.status !== 201) {
      throw new GuardaPortalErro(
         `POST /ordensservico retornou HTTP ${oRes.status}: ${JSON.stringify(oCorpo.mensagem ?? oCorpo).slice(0, 300)}`,
      );
   }
   const cOrdemServico = padOs(oCorpo.ordemServico);
   if (!cOrdemServico) {
      throw new GuardaPortalErro('POST /ordensservico sem número da OS na resposta.');
   }
   return {empresa: String(oCorpo.empresa ?? cEmpresa).trim(), ordemServico: cOrdemServico, serie: C_SERIE_OS};
}
