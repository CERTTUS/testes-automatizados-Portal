/**
 * Aplica o tema avançado T3103 na empresa 0001 (Talk → MS homolog).
 * Tema é por empresa: rode antes do grupo de CTs daquele cenário.
 *
 *   node scripts/qa/massa-t3103-homolog-aplicar.mjs personalizado
 *   node scripts/qa/massa-t3103-homolog-aplicar.mjs automatico
 *   node scripts/qa/massa-t3103-homolog-aplicar.mjs legado
 *   node scripts/qa/massa-t3103-homolog-aplicar.mjs invalido
 *   node scripts/qa/massa-t3103-homolog-aplicar.mjs cards
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { M_CENARIOS } from './massa-t3103-homolog-temas.mjs';

const C_RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C_ENV = path.join(C_RAIZ, '.env.local');

const oEnv = Object.fromEntries(
   readFileSync(C_ENV, 'utf8')
      .split(/\r?\n/)
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
);

const cCenario = (process.argv[2] ?? '').trim().toLowerCase();
const oCenario = M_CENARIOS[cCenario];
if (!oCenario) {
   console.error(
      `Cenário inválido: "${cCenario}". Use: ${Object.keys(M_CENARIOS).join(', ')}`,
   );
   process.exit(1);
}

const C_TALK_UI = (oEnv.TALK_BASE_URL ?? 'http://34.195.122.141:8081').replace(/\/$/, '');
const C_TALK =
   (oEnv.TALK_API_URL ?? C_TALK_UI.replace(/:8081$/, ':8080')).replace(/\/$/, '');
const C_EMAIL = oEnv.TALK_EMAIL;
const C_SENHA = oEnv.TALK_PASSWORD;
const C_EMPRESA = oEnv.PORTAL_EMPRESA_HOMOLOG ?? '0001';
const C_BFF = (oEnv.E2E_API_BASE_URL ?? 'http://34.195.122.141:3333').replace(/\/$/, '');
const C_TOKEN_PROBE = oEnv.PORTAL_TOKEN_T3103_PERSONALIZADO ?? oEnv.PORTAL_TOKEN_HOMOLOG;

if (!C_EMAIL || !C_SENHA) {
   throw new Error('TALK_EMAIL e TALK_PASSWORD no .env.local');
}

const C_TZ = 'America/Sao_Paulo';

const login = async () => {
   const oRes = await fetch(`${C_TALK}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', timezone: C_TZ },
      body: JSON.stringify({
         email: C_EMAIL,
         password: C_SENHA,
         tipoDeDispositivo: 'desktop',
      }),
   });
   const o = await oRes.json();
   if (oRes.status !== 200 || !o.token) {
      throw new Error(`Login Talk ${oRes.status}: ${JSON.stringify(o)}`);
   }
   return o.token;
};

const patchTema = async (cToken) => {
   const oRes = await fetch(`${C_TALK}/portal-cliente/config/${C_EMPRESA}`, {
      method: 'PATCH',
      headers: {
         authorization: `Bearer ${cToken}`,
         timezone: C_TZ,
         'content-type': 'application/json',
      },
      body: JSON.stringify({
         temaModo: oCenario.cTemaModo,
         temaAvancado: oCenario.oTemaAvancado,
      }),
   });
   const o = await oRes.json().catch(() => ({}));
   if (oRes.status !== 200) {
      throw new Error(`PATCH tema ${oRes.status}: ${JSON.stringify(o)}`);
   }
   return o;
};

const landingProbe = async () => {
   if (!C_TOKEN_PROBE) {
      return null;
   }
   const oRes = await fetch(`${C_BFF}/portal/${encodeURIComponent(C_TOKEN_PROBE)}`);
   const o = await oRes.json().catch(() => ({}));
   return { nStatus: oRes.status, loginTexto: o?.oDados?.oTemaAvancado?.loginTexto };
};

const cJwt = await login();
await patchTema(cJwt);
console.log(`Tema aplicado: ${cCenario} — ${oCenario.cRotulo}`);
await new Promise((r) => setTimeout(r, 1500));
const oProbe = await landingProbe();
if (oProbe) {
   console.log(
      `Probe BFF ${C_TOKEN_PROBE}: HTTP ${oProbe.nStatus}, loginTexto=${oProbe.loginTexto ?? '(n/a)'}`,
   );
}