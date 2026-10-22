import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {EMPRESA_PERMITIDA, GuardaPortalErro, urlBancoTesteValidada} from './portalGuard';

/**
 * Flag do Portal (configuracoesservicosordemservicofluxo.portalclienteutilizar) da empresa 0001
 * no banco LOCAL portaldocliente.
 *
 * Desenho anti-corrida (specs em paralelo):
 *  - habilitar/restaurar são chamados UMA vez por execução, pelos projetos Playwright de setup/teardown
 *    (dependência do projeto `portal-link-409`), nunca por arquivo de spec.
 *  - o valor ORIGINAL fica em arquivo de estado (.portal-state/) gravado ANTES do UPDATE, com contagem de
 *    referência: execuções sobrepostas incrementam `refs`; só a última restaura. Estado remanescente de
 *    uma execução interrompida é reaproveitado (o original NUNCA é sobrescrito pelo valor já alterado).
 *  - restaurar confere por leitura que o valor voltou ao original; se não, falha alto.
 */

const { Client } = pg;

const C_DIR_ESTADO = path.resolve(process.cwd(), '.portal-state');
const C_ARQ_ESTADO = path.join(C_DIR_ESTADO, `portal-flag-${EMPRESA_PERMITIDA}.json`);
const C_DIR_LOCK = path.join(C_DIR_ESTADO, 'lock');

interface EstadoFlag {
   empresa: string;
   original: number;
   refs: number;
   atualizadoEm: string;
}

async function comCliente<T>(fFn: (oCli: pg.Client) => Promise<T>): Promise<T> {
   const oCli = new Client({connectionString: urlBancoTesteValidada(), connectionTimeoutMillis: 5_000});
   await oCli.connect();
   try {
      return await fFn(oCli);
   } finally {
      await oCli.end();
   }
}

async function lerFlag(oCli: pg.Client): Promise<number> {
   const oRes = await oCli.query<{portalclienteutilizar: number | null}>(
      'SELECT portalclienteutilizar FROM configuracoesservicosordemservicofluxo WHERE empresa = $1',
      [EMPRESA_PERMITIDA],
   );
   if (oRes.rows.length !== 1) {
      throw new GuardaPortalErro(
         `configuracoesservicosordemservicofluxo sem exatamente 1 linha para empresa ${EMPRESA_PERMITIDA} (achou ${oRes.rows.length}).`,
      );
   }
   return Number(oRes.rows[0].portalclienteutilizar ?? 0);
}

async function gravarFlag(oCli: pg.Client, nValor: number): Promise<void> {
   const oRes = await oCli.query(
      'UPDATE configuracoesservicosordemservicofluxo SET portalclienteutilizar = $1 WHERE empresa = $2',
      [nValor, EMPRESA_PERMITIDA],
   );
   if (oRes.rowCount !== 1) {
      throw new GuardaPortalErro(`UPDATE da flag afetou ${oRes.rowCount} linhas (esperado 1).`);
   }
}

function lerEstado(): EstadoFlag | null {
   if (!fs.existsSync(C_ARQ_ESTADO)) {
      return null;
   }
   return JSON.parse(fs.readFileSync(C_ARQ_ESTADO, 'utf8')) as EstadoFlag;
}

function gravarEstado(oEstado: EstadoFlag): void {
   fs.writeFileSync(C_ARQ_ESTADO, JSON.stringify({...oEstado, atualizadoEm: new Date().toISOString()}, null, 2));
}

async function comTrava<T>(fFn: () => Promise<T>): Promise<T> {
   fs.mkdirSync(C_DIR_ESTADO, {recursive: true});
   const nLimite = Date.now() + 30_000;
   for (;;) {
      try {
         fs.mkdirSync(C_DIR_LOCK);
         break;
      } catch {
         // trava órfã (processo morto) com mais de 60 s é removida
         try {
            if (Date.now() - fs.statSync(C_DIR_LOCK).mtimeMs > 60_000) {
               fs.rmdirSync(C_DIR_LOCK);
               continue;
            }
         } catch {
            continue;
         }
         if (Date.now() > nLimite) {
            throw new GuardaPortalErro('trava do estado da flag ocupada há mais de 30 s (.portal-state/lock).');
         }
         await new Promise((fOk) => setTimeout(fOk, 100));
      }
   }
   try {
      return await fFn();
   } finally {
      fs.rmdirSync(C_DIR_LOCK);
   }
}

/** Habilita a flag (=1) preservando o valor original. Retorna o original registrado. */
export async function habilitarFlagPortal(): Promise<number> {
   return comTrava(() =>
      comCliente(async (oCli) => {
         const oExistente = lerEstado();
         const nOriginal = oExistente ? oExistente.original : await lerFlag(oCli);
         // Estado em disco ANTES de alterar o banco: se o processo morrer, o original está salvo.
         gravarEstado({empresa: EMPRESA_PERMITIDA, original: nOriginal, refs: (oExistente?.refs ?? 0) + 1, atualizadoEm: ''});
         await gravarFlag(oCli, 1);
         const nAtual = await lerFlag(oCli);
         if (nAtual !== 1) {
            throw new GuardaPortalErro(`flag não ficou habilitada (lida: ${nAtual}).`);
         }
         return nOriginal;
      }),
   );
}

/** Restaura o valor original quando a última referência é liberada. Idempotente se não houver estado. */
export async function restaurarFlagPortal(): Promise<{restaurado: boolean; original?: number}> {
   return comTrava(async () => {
      const oEstado = lerEstado();
      if (!oEstado) {
         return {restaurado: false};
      }
      if (oEstado.refs > 1) {
         gravarEstado({...oEstado, refs: oEstado.refs - 1});
         return {restaurado: false, original: oEstado.original};
      }
      await comCliente(async (oCli) => {
         await gravarFlag(oCli, oEstado.original);
         const nAtual = await lerFlag(oCli);
         if (nAtual !== oEstado.original) {
            throw new GuardaPortalErro(
               `FALHA ao restaurar: esperado ${oEstado.original}, lido ${nAtual}. Estado mantido em .portal-state/.`,
            );
         }
      });
      fs.rmSync(C_ARQ_ESTADO, {force: true});
      return {restaurado: true, original: oEstado.original};
   });
}
