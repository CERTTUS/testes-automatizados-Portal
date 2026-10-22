import pg from 'pg';
import type {APIRequestContext, PlaywrightWorkerArgs} from '@playwright/test';
import {cEnv} from './env';
import {
   atualizarEncerramentoOs,
   DATABASE_PERMITIDO,
   EMPRESA_PERMITIDA,
   exigirOptInSupabase,
   GuardaPortalErro,
   lerRegistroOsDoSpec,
   registrarOsCriada,
   runIdAtual,
   urlBancoTesteValidada,
} from './portalGuard';
import {
   criarOsViaApiMobile,
   descobrirMassaOs,
   exigirPreRequisitosCriacaoOs,
   loginApiMobile,
} from './portalApiMobile';
import {PORTAL_MS_DATABASE, PORTAL_MS_SERIE, TELEFONE_A, revogarLinkStatus} from './portalLink';

/**
 * Massa do módulo portal-link-409-ctoken: CADA spec/arquivo cria a PRÓPRIA OS no beforeAll (via api-mobile) e
 * usa somente ela. O id/número/série/empresa ficam em .portal-state/os-criadas/<runId>/<spec>.json, e as guardas
 * (portalGuard.exigirEscritaPermitida) só aceitam OS desse registro.
 *
 * Limpeza (afterAll): revoga o link da OS (POST /portal/link/revogar). A OS NÃO é cancelada: a api-mobile só
 * cancela por PUT com fase 'C', que exige reserva da OS + body completo + ao menos 1 peça/serviço (efeito em
 * estoque/financeiro) — sem forma segura sem decisão humana. A OS fica em Recepção, identificável pelo marcador
 * (cliente sem cadastro "QA-AUTO URG10463 ..."). Nunca há DELETE/UPDATE direto no banco do ERP.
 */

type Playwright = PlaywrightWorkerArgs['playwright'];

export interface OsDeTeste {
   spec: string;
   database: string;
   empresa: string;
   ordemServico: string;
   serie: string;
   telefone: string;
   marcador: string;
}

function aguardar(nMs: number): Promise<void> {
   return new Promise((fOk) => setTimeout(fOk, nMs));
}

function paraOsDeTeste(o: {
   spec: string;
   database: string;
   empresa: string;
   ordemServico: string;
   serie: string;
   telefone: string;
   marcador: string;
}): OsDeTeste {
   return {
      spec: o.spec,
      database: o.database,
      empresa: o.empresa,
      ordemServico: o.ordemServico,
      serie: o.serie,
      telefone: o.telefone,
      marcador: o.marcador,
   };
}

/** Confere (SELECT somente leitura) que a OS criada pela api-mobile está no MESMO banco que a flag/MS usam. */
async function conferirOsNoBancoDoTenant(oOs: OsDeTeste): Promise<string> {
   const oCli = new pg.Client({connectionString: urlBancoTesteValidada(), connectionTimeoutMillis: 5_000});
   await oCli.connect();
   try {
      const oRes = await oCli.query<{status: string}>(
         'SELECT trim(status) AS status FROM pcrtase0 WHERE empfil = $1 AND ordser = $2 AND rtrim(serie) = $3',
         [oOs.empresa, oOs.ordemServico, oOs.serie],
      );
      if (oRes.rows.length !== 1) {
         throw new GuardaPortalErro(
            `a OS ${oOs.empresa}/${oOs.ordemServico}/${oOs.serie} criada pela api-mobile NÃO aparece em pcrtase0 do banco ${DATABASE_PERMITIDO} ` +
               '(PORTAL_TEST_DB_URL). A api-mobile está apontando para outro banco (BANCO_DADOS_URL do .env dela) — ' +
               'o MS (cDatabase=portaldocliente) e a flag não enxergariam a OS. Ajuste o ambiente; não foi feita nenhuma outra escrita.',
         );
      }
      return oRes.rows[0].status;
   } finally {
      await oCli.end().catch(() => undefined);
   }
}

/**
 * A api-mobile emite o link da OS sozinha (best-effort, assíncrono) ao gravar, com o celular da OS. Para o teste
 * começar com a OS "sem link ativo", espera esse link aparecer e o revoga (200 = existia). Sem link (flag desligada
 * etc.) segue após o limite de espera.
 */
async function aguardarLinkAutomaticoEResetar(oRequest: APIRequestContext, oOs: OsDeTeste): Promise<boolean> {
   const nLimite = Date.now() + Number(cEnv('PORTAL_ESPERA_LINK_AUTO_MS', '8000'));
   while (Date.now() < nLimite) {
      const nStatus = await revogarLinkStatus(oRequest, oOs.ordemServico);
      if (nStatus === 200) {
         return true;
      }
      if (nStatus !== 404) {
         throw new GuardaPortalErro(`revogar o link automático da OS ${oOs.ordemServico} retornou HTTP ${nStatus}.`);
      }
      await aguardar(500);
   }
   return false;
}

/** Cria (ou reaproveita, se o worker reiniciou na mesma execução) a OS do spec. Chamar no beforeAll. */
export async function prepararOsDoSpec(oPlaywright: Playwright, cSpec: string): Promise<OsDeTeste> {
   const oExistente = lerRegistroOsDoSpec(cSpec);
   if (oExistente) {
      return paraOsDeTeste(oExistente); // worker reiniciado: não cria outra OS
   }

   exigirPreRequisitosCriacaoOs();
   exigirOptInSupabase(); // a api-mobile emite link no Supabase ao gravar a OS
   const oSessao = await loginApiMobile();
   const oMassa = await descobrirMassaOs(oSessao, EMPRESA_PERMITIDA);
   const cMarcador = `QA-AUTO URG10463 ${cSpec} ${runIdAtual().slice(-8)}`.slice(0, 40);

   const oCriada = await criarOsViaApiMobile(oSessao, oMassa, EMPRESA_PERMITIDA, cMarcador, TELEFONE_A);
   const oOs: OsDeTeste = {
      spec: cSpec,
      database: PORTAL_MS_DATABASE,
      empresa: oCriada.empresa,
      ordemServico: oCriada.ordemServico,
      serie: oCriada.serie || PORTAL_MS_SERIE,
      telefone: TELEFONE_A,
      marcador: cMarcador,
   };
   // Registra ANTES de qualquer validação: se algo falhar, a OS criada continua rastreada.
   registrarOsCriada({
      ...oOs,
      runId: runIdAtual(),
      criadaEm: new Date().toISOString(),
      encerramento: 'pendente',
   });

   if (oOs.empresa !== EMPRESA_PERMITIDA) {
      throw new GuardaPortalErro(
         `a OS ${oOs.ordemServico} foi criada na empresa "${oOs.empresa}" (esperado ${EMPRESA_PERMITIDA}); a suíte só opera na ${EMPRESA_PERMITIDA}. Registrada em .portal-state; nenhuma emissão foi feita.`,
      );
   }
   const cStatus = await conferirOsNoBancoDoTenant(oOs);
   const oRequest = await oPlaywright.request.newContext();
   try {
      const lHouveLinkAuto = await aguardarLinkAutomaticoEResetar(oRequest, oOs);
      console.log(
         `[portal-link-409] OS criada pelo teste: spec=${cSpec} empresa=${oOs.empresa} os=${oOs.ordemServico} serie=${oOs.serie} status=${cStatus} ` +
            `(origem operação/consumidor final: ${JSON.stringify(oMassa.origem)}; link automático da api-mobile ${lHouveLinkAuto ? 'revogado' : 'não observado'}).`,
      );
   } finally {
      await oRequest.dispose();
   }
   return oOs;
}

/**
 * afterAll: revoga o link da OS do spec e marca o encerramento no registro. A OS não é cancelada (ver cabeçalho).
 * Usa o registro (não a variável do spec), então limpa também quando o beforeAll falhou depois de criar a OS.
 */
export async function encerrarOsDoSpec(oPlaywright: Playwright, cSpec: string): Promise<void> {
   const oReg = lerRegistroOsDoSpec(cSpec);
   if (!oReg) {
      return; // beforeAll nem chegou a criar a OS
   }
   const oOs = paraOsDeTeste(oReg);
   const oRequest = await oPlaywright.request.newContext();
   try {
      const nStatus = await revogarLinkStatus(oRequest, oOs.ordemServico);
      if (nStatus !== 200 && nStatus !== 404) {
         throw new GuardaPortalErro(`limpeza: revogar o link da OS ${oOs.ordemServico} retornou HTTP ${nStatus}.`);
      }
      atualizarEncerramentoOs(oOs.spec, 'link-revogado');
      console.log(
         `[portal-link-409] link da OS ${oOs.ordemServico} revogado; a OS permanece aberta no ERP (Recepção, marcador "${oOs.marcador}") — sem cancelamento automático.`,
      );
   } finally {
      await oRequest.dispose();
   }
}
