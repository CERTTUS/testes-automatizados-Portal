import pg from 'pg';
import {cEnv} from '../env';

/**
 * Consultas somente leitura (SELECT) ao banco do tenant (portaldocliente) e do Talk.
 * Nenhuma escrita: INSERT/UPDATE/DELETE/DDL são proibidos neste módulo.
 */

const oPools = new Map<string, pg.Pool>();

function oPool(cUrl: string): pg.Pool {
   let oP = oPools.get(cUrl);
   if (!oP) {
      oP = new pg.Pool({connectionString: cUrl, max: 2});
      oPools.set(cUrl, oP);
   }
   return oP;
}

const cUrlTenant = (): string =>
   cEnv('PORTAL_BO_PG_URL_TENANT', 'postgresql://postgres:postgres@localhost:5432/portaldocliente');
const cUrlTalk = (): string => cEnv('PORTAL_BO_PG_URL_TALK', 'postgresql://postgres:postgres@localhost:5432/talk');

/** Fecha todas as conexões (chamar no afterAll). */
export async function bancoFechar(): Promise<void> {
   const mPools = [...oPools.values()];
   oPools.clear();
   await Promise.all(mPools.map((oP) => oP.end().catch(() => undefined)));
}

function cCampo(oLinha: Record<string, unknown> | undefined, cNome: string): string {
   if (!oLinha) return '';
   const cAchado = Object.keys(oLinha).find((c) => c.toLowerCase() === cNome.toLowerCase());
   return cAchado ? String(oLinha[cAchado] ?? '').trim() : '';
}

export async function osMassaCarregar(): Promise<string> {
   const cFixa = cEnv('PORTAL_BO_OS_MASSA');
   if (cFixa) return cFixa;
   const oRes = await oPool(cUrlTenant()).query(
      `SELECT ORDSER FROM PCRTASE0 WHERE EMPFIL = '0001' AND SERIE = 'SR' AND CLIFOR = '0013402' AND STATUS <> 'C' ORDER BY ORDSER ASC LIMIT 1`,
   );
   return cCampo(oRes.rows[0], 'ordser');
}

export async function osConsolidacaoCarregar(): Promise<string> {
   const cFixa = cEnv('PORTAL_BO_OS_CONSOLIDACAO');
   if (cFixa) return cFixa;
   const oRes = await oPool(cUrlTenant()).query(
      `SELECT ORDSER FROM PCRTASE0 WHERE EMPFIL = '0002' AND SERIE = 'SR' AND STATUS <> 'C' ORDER BY ORDSER DESC LIMIT 1`,
   );
   return cCampo(oRes.rows[0], 'ordser');
}

export type oOsDados = {
   cOrdemServico: string;
   cStatus: string;
   cCelular: string;
   cVeiculoCodigo: string;
   cVeiculoDescricao: string;
   cPlaca: string;
};

export async function osDadosCarregar(cEmpresa: string, cOrdemServico: string): Promise<oOsDados | null> {
   const oRes = await oPool(cUrlTenant()).query(
      `SELECT a.ORDSER AS ordser, a.STATUS AS status, a.CELULAR AS celular, a.VEICUL AS veicul,
              v.DESCRI AS descri, v.Placa AS placa
         FROM PCRTASE0 a
         LEFT JOIN PCRTVEI0 v ON v.Codigo = a.VEICUL
        WHERE a.EMPFIL = $1 AND a.SERIE = 'SR' AND a.ORDSER = $2
        LIMIT 1`,
      [cEmpresa, cOrdemServico],
   );
   const oL = oRes.rows[0];
   if (!oL) return null;
   return {
      cOrdemServico: cCampo(oL, 'ordser'),
      cStatus: cCampo(oL, 'status'),
      cCelular: cCampo(oL, 'celular'),
      cVeiculoCodigo: cCampo(oL, 'veicul'),
      cVeiculoDescricao: cCampo(oL, 'descri'),
      cPlaca: cCampo(oL, 'placa'),
   };
}

export type oMensagemTalk = {cBody: string; dCriada: Date};

export async function mensagensTalkDaOsCarregar(cOrdemServico: string): Promise<oMensagemTalk[]> {
   const oRes = await oPool(cUrlTalk()).query(
      `SELECT m.body AS body, cm."createdAt" AS criada
         FROM "ConversaMensagens" cm
         JOIN "Messages" m ON m.id = cm."messageId"
        WHERE cm."fromMe" = true AND m.body LIKE $1
        ORDER BY cm."createdAt"`,
      [`%${cOrdemServico}%`],
   );
   return oRes.rows.map((oL) => ({cBody: String(oL.body ?? ''), dCriada: oL.criada as Date}));
}

/** Token do link: último segmento de caminho da URL dentro do corpo da mensagem. */
export function tokenDaMensagemExtrair(cBody: string): string | null {
   const oM = /https?:\/\/\S+\/([A-Za-z0-9_-]{10,})/.exec(cBody);
   return oM ? oM[1] : null;
}

/** Celular da OS (PCRTASE0) em E.164 BR (55 + dígitos). */
export function celularE164(cCelular: string): string {
   const cDigitos = cCelular.replace(/\D/g, '');
   return cDigitos.startsWith('55') && cDigitos.length >= 12 ? cDigitos : `55${cDigitos}`;
}
