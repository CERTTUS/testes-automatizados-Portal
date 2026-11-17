/**
 * Emite links do Portal no MS de teste (iberia/0001) para OSs vizinhas da OS base,
 * mantém só os que abrem no portal (landing 200) e revoga os demais.
 *
 * Env: PORTAL_MS_HOMOLOG_* no .env.local do repo.
 *   QTD=5 (default) · OS_BASE=76018 · SERIE=SR · MAX=40
 *
 * Ex.: node scripts/qa/gerar-tokens-portal-homolog.mjs
 *      QTD=10 node scripts/qa/gerar-tokens-portal-homolog.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const C_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C_ENV = path.join(C_RAIZ, '.env.local');

const oEnv = Object.fromEntries(
   readFileSync(C_ENV, 'utf8')
      .split(/\r?\n/)
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
);

const C_MS = oEnv.PORTAL_MS_HOMOLOG_URL;
const C_CHAVE = oEnv.PORTAL_MS_HOMOLOG_CHAVEAPI;
const C_DB = oEnv.PORTAL_MS_HOMOLOG_DATABASE ?? 'iberia';
const C_BFF = (oEnv.E2E_API_BASE_URL ?? 'http://34.195.122.141:3333').replace(/\/$/, '');
const C_EMPRESA = oEnv.PORTAL_EMPRESA_HOMOLOG ?? '0001';
const C_SERIE = process.env.SERIE ?? 'SR';
const N_BASE = Number(process.env.OS_BASE ?? 76018);
const N_QUANTIDADE = Number(process.env.QTD ?? 5);
const N_MAX_TENTATIVAS = Number(process.env.MAX ?? 40);
const C_TELEFONE =
   (oEnv.PORTAL_TELEFONE_HOMOLOG ?? '46991178665').replace(/\D/g, '').length === 11
      ? `55${(oEnv.PORTAL_TELEFONE_HOMOLOG ?? '46991178665').replace(/\D/g, '')}`
      : (oEnv.PORTAL_TELEFONE_HOMOLOG ?? '5546991178665').replace(/\D/g, '');
const M_IGNORAR = new Set(
   (process.env.OS_IGNORAR ?? '076018').split(/[,;\s]+/).filter(Boolean),
);

if (!C_MS || !C_CHAVE) {
   throw new Error('PORTAL_MS_HOMOLOG_URL / PORTAL_MS_HOMOLOG_CHAVEAPI ausentes no .env.local');
}

const oHeaders = { 'content-type': 'application/json', chaveapi: C_CHAVE };
const esperar = (n) => new Promise((r) => setTimeout(r, n));

const emitir = async (cOs) => {
   const oRes = await fetch(`${C_MS}/portal/link`, {
      method: 'POST',
      headers: oHeaders,
      body: JSON.stringify({
         cDatabase: C_DB,
         cEmpresa: C_EMPRESA,
         cOrdemServico: cOs,
         cSerie: C_SERIE,
         cTelefone: C_TELEFONE,
      }),
   });
   const o = await oRes.json().catch(() => ({}));
   return {
      nStatus: oRes.status,
      cToken: o?.oDados?.cToken,
      lHash: o?.oDados?.lHashAtualizado,
      cMsg: o?.cMensagem,
   };
};

const landing = async (cToken) => {
   const oRes = await fetch(`${C_BFF}/portal/${encodeURIComponent(cToken)}`);
   const o = await oRes.json().catch(() => ({}));
   return { nStatus: oRes.status, cMsg: o?.cMensagem ?? '' };
};

const revogar = async (cToken) => {
   const oRes = await fetch(`${C_MS}/portal/link/revogar`, {
      method: 'POST',
      headers: oHeaders,
      body: JSON.stringify({ cToken }),
   });
   return oRes.status;
};

const mCandidatos = [];
for (let i = 1; mCandidatos.length < N_MAX_TENTATIVAS; i++) {
   for (const n of [N_BASE - i, N_BASE + i]) {
      const c = String(n).padStart(6, '0');
      if (n > 0 && !M_IGNORAR.has(c)) {
         mCandidatos.push(c);
      }
   }
}

const mOk = [];
for (const cOs of mCandidatos) {
   if (mOk.length >= N_QUANTIDADE) {
      break;
   }
   const oE = await emitir(cOs);
   if (oE.nStatus !== 200 || !oE.cToken) {
      console.log(`${cOs}/${C_SERIE}: emissão ${oE.nStatus} ${oE.cMsg ?? ''}`);
      continue;
   }
   const oL = await landing(oE.cToken);
   if (oL.nStatus === 200) {
      mOk.push({ cOs, cToken: oE.cToken, lHash: oE.lHash });
      console.log(
         `${cOs}/${C_SERIE}: OK ${oE.cToken}${oE.lHash ? ' (hash atualizado)' : ''}`,
      );
   } else {
      const nRev = await revogar(oE.cToken);
      console.log(
         `${cOs}/${C_SERIE}: descartado (landing ${oL.nStatus} ${oL.cMsg}); revogado ${nRev}`,
      );
   }
   await esperar(400);
}

const C_BASE_URL = (oEnv.E2E_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

console.log('\nRESULTADO');
for (const o of mOk) {
   console.log(`${o.cOs}/${C_SERIE}\t${C_BASE_URL}/${o.cToken}`);
}

const M_VAR = [
   'PORTAL_TOKEN_T3103_PERSONALIZADO',
   'PORTAL_TOKEN_T3103_AUTOMATICO',
   'PORTAL_TOKEN_T3103_LEGADO',
   'PORTAL_TOKEN_T3103_INVALIDO',
   'PORTAL_TOKEN_T3103_CARDS_SEPARADOS',
];

if (mOk.length >= 1) {
   console.log('\n# Sugestão .env.local (mapear cenário → token na ordem dos CTs T3103):');
   for (let i = 0; i < Math.min(mOk.length, M_VAR.length); i++) {
      console.log(`${M_VAR[i]}=${mOk[i].cToken}`);
   }
   console.log('PORTAL_NOME_T3103_PERSONALIZADO=TESTE');
}

if (mOk.length < N_QUANTIDADE) {
   console.log(`\nSó ${mOk.length} de ${N_QUANTIDADE} encontrados em ${mCandidatos.length} tentativas.`);
   process.exitCode = 1;
}