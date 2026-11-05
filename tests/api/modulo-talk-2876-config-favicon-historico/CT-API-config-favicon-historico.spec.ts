import {expect, test} from '@playwright/test';
import type {TestInfo} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

const {Client} = pg;

const C_DB_TESTE = 'portalcliente-teste-talk-2876';
const C_ADMIN_URL = process.env.PORTAL_SQL_ADMIN_URL ?? 'postgres://postgres@localhost:5432/postgres';
const C_REPO_API = process.env.PORTAL_API_REPO ?? path.resolve(process.cwd(), '../portalcliente-api');
const O_DEFAULT = {lExibir: false, mFases: ['D', 'P', 'O', ' ', 'E', 'T', 'R', 'B', 'U', 'F'], nPeriodoDias: 180};

function cUrlDatabaseTeste(): string {
   const oUrl = new URL(C_ADMIN_URL);
   oUrl.pathname = `/${C_DB_TESTE}`;
   return oUrl.toString();
}

async function evidenciar(testInfo: TestInfo, cCtId: string, oCorpo: unknown): Promise<void> {
   await evidenciarApiPreCr(
      testInfo,
      cCtId,
      200,
      `postgresql://localhost/${C_DB_TESTE} (contrato SQL)`,
      JSON.stringify(oCorpo),
   );
}

function cSqlStateDe(oErro: unknown): string {
   if (oErro && typeof oErro === 'object' && 'code' in oErro && typeof (oErro as {code: unknown}).code === 'string') {
      return (oErro as {code: string}).code;
   }
   throw oErro;
}

let oClient: InstanceType<typeof Client> | undefined;
let cSqlNovo = '';

test.describe('API — contrato SQL portal_cliente_config favicon/histórico (TALK-2876)', () => {
   test.describe.configure({mode: 'serial'});

   test.beforeAll(async () => {
      const cSqlBasePath = path.join(C_REPO_API, 'migrations', 'supabase_portal_cliente_config.sql');
      const cSqlNovoPath = path.join(
         C_REPO_API,
         'migrations',
         'supabase_portal_cliente_config_favicon_historico.sql',
      );
      if (!fs.existsSync(cSqlBasePath)) {
         throw new Error(`Migration base não encontrada: ${cSqlBasePath}`);
      }
      if (!fs.existsSync(cSqlNovoPath)) {
         throw new Error(`Migration nova não encontrada: ${cSqlNovoPath}`);
      }
      const cSqlBase = fs.readFileSync(cSqlBasePath, 'utf8');
      cSqlNovo = fs.readFileSync(cSqlNovoPath, 'utf8');

      const oAdmin = new Client({connectionString: C_ADMIN_URL});
      await oAdmin.connect();
      try {
         await oAdmin.query(`DROP DATABASE IF EXISTS "${C_DB_TESTE}" WITH (FORCE)`);
         await oAdmin.query(`CREATE DATABASE "${C_DB_TESTE}"`);
      } finally {
         await oAdmin.end();
      }

      oClient = new Client({connectionString: cUrlDatabaseTeste()});
      await oClient.connect();
      await oClient.query(cSqlBase);
      await oClient.query(
         `INSERT INTO public.portal_cliente_config ("database", empresa, logo_url)
          VALUES ('db_antigo', '1', 'https://cdn.exemplo.com/logo.png')`,
      );
   });

   test.afterAll(async () => {
      if (oClient) {
         await oClient.end().catch(() => undefined);
         oClient = undefined;
      }
      const oAdmin = new Client({connectionString: C_ADMIN_URL});
      await oAdmin.connect();
      try {
         await oAdmin.query(`DROP DATABASE IF EXISTS "${C_DB_TESTE}" WITH (FORCE)`);
      } finally {
         await oAdmin.end();
      }
   });

   test('CT-API-01 — Migration aplicada duas vezes sem erro (idempotência)', async ({}, testInfo) => {
      await oClient!.query(cSqlNovo);
      await oClient!.query(cSqlNovo);
      const oRes = await oClient!.query<{n: number}>(
         `SELECT count(*)::int AS n
            FROM pg_constraint
           WHERE conname = 'portal_cliente_config_historico_config_chk'
             AND conrelid = 'public.portal_cliente_config'::regclass`,
      );
      expect(oRes.rows[0].n).toBe(1);
      await evidenciar(testInfo, 'CT-API-01', {nConstraints: oRes.rows[0].n});
   });

   test('CT-API-02 — Colunas novas com tipo e default corretos', async ({}, testInfo) => {
      const oRes = await oClient!.query<{
         column_name: string;
         data_type: string;
         is_nullable: string;
         column_default: string | null;
      }>(
         `SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'portal_cliente_config'
             AND column_name IN ('favicon_url', 'historico_config')
           ORDER BY column_name`,
      );
      const oFavicon = oRes.rows.find((oLinha) => oLinha.column_name === 'favicon_url');
      const oHistorico = oRes.rows.find((oLinha) => oLinha.column_name === 'historico_config');
      expect(oFavicon).toBeDefined();
      expect(oFavicon!.data_type).toBe('text');
      expect(oFavicon!.is_nullable).toBe('YES');
      expect(oHistorico).toBeDefined();
      expect(oHistorico!.data_type).toBe('jsonb');
      expect(oHistorico!.is_nullable).toBe('NO');
      expect(oHistorico!.column_default).toBeTruthy();
      expect(oHistorico!.column_default).toContain('::jsonb');
      await evidenciar(testInfo, 'CT-API-02', {
         favicon_url: oFavicon,
         historico_config: oHistorico,
      });
   });

   test('CT-API-03 — Config já existente recebe o padrão', async ({}, testInfo) => {
      const oRes = await oClient!.query<{favicon_url: string | null; historico_config: typeof O_DEFAULT}>(
         `SELECT favicon_url, historico_config
            FROM public.portal_cliente_config
           WHERE "database" = 'db_antigo'`,
      );
      expect(oRes.rows[0].favicon_url).toBeNull();
      expect(oRes.rows[0].historico_config).toEqual(O_DEFAULT);
      await evidenciar(testInfo, 'CT-API-03', oRes.rows[0]);
   });

   test('CT-API-04 — Config nova sem os campos novos recebe o padrão', async ({}, testInfo) => {
      await oClient!.query(
         `INSERT INTO public.portal_cliente_config ("database", empresa) VALUES ('db_novo', '1')`,
      );
      const oRes = await oClient!.query<{favicon_url: string | null; historico_config: typeof O_DEFAULT}>(
         `SELECT favicon_url, historico_config
            FROM public.portal_cliente_config
           WHERE "database" = 'db_novo'`,
      );
      expect(oRes.rows[0].favicon_url).toBeNull();
      expect(oRes.rows[0].historico_config).toEqual(O_DEFAULT);
      await evidenciar(testInfo, 'CT-API-04', oRes.rows[0]);
   });

   test('CT-API-05 — Configs de histórico inválidas são recusadas', async ({}, testInfo) => {
      const mCasos: {cNome: string; cValor: string | null; cSqlState: string}[] = [
         {cNome: 'fase C', cValor: '{"lExibir":true,"mFases":["C"],"nPeriodoDias":180}', cSqlState: '23514'},
         {cNome: 'período 60', cValor: '{"lExibir":true,"mFases":["D"],"nPeriodoDias":60}', cSqlState: '23514'},
         {cNome: 'período texto', cValor: '{"lExibir":true,"mFases":["D"],"nPeriodoDias":"180"}', cSqlState: '23514'},
         {cNome: 'lExibir texto', cValor: '{"lExibir":"sim","mFases":["D"],"nPeriodoDias":180}', cSqlState: '23514'},
         {cNome: 'array', cValor: '[]', cSqlState: '23514'},
         {cNome: 'sem mFases', cValor: '{"lExibir":true,"nPeriodoDias":180}', cSqlState: '23514'},
         {cNome: 'sem lExibir', cValor: '{"mFases":["D"],"nPeriodoDias":180}', cSqlState: '23514'},
         {cNome: 'sem nPeriodoDias', cValor: '{"lExibir":true,"mFases":["D"]}', cSqlState: '23514'},
         {cNome: 'NULL', cValor: null, cSqlState: '23502'},
      ];
      const mResultados: {cNome: string; cSqlState: string}[] = [];
      for (const oCaso of mCasos) {
         let cSqlState = 'ok';
         try {
            await oClient!.query(
               `UPDATE public.portal_cliente_config
                   SET historico_config = $1::jsonb
                 WHERE "database" = 'db_novo'`,
               [oCaso.cValor],
            );
         } catch (oErro) {
            cSqlState = cSqlStateDe(oErro);
         }
         mResultados.push({cNome: oCaso.cNome, cSqlState});
         expect(cSqlState, oCaso.cNome).toBe(oCaso.cSqlState);
      }
      const oRes = await oClient!.query<{historico_config: typeof O_DEFAULT}>(
         `SELECT historico_config
            FROM public.portal_cliente_config
           WHERE "database" = 'db_novo'`,
      );
      expect(oRes.rows[0].historico_config).toEqual(O_DEFAULT);
      await evidenciar(testInfo, 'CT-API-05', mResultados);
   });

   test('CT-API-06 — Configs válidas são aceitas e a fase Produção (espaço) é preservada', async ({}, testInfo) => {
      const oComEspaco = {lExibir: true, mFases: ['A', ' '], nPeriodoDias: 365};
      const oResEspaco = await oClient!.query(
         `UPDATE public.portal_cliente_config
             SET historico_config = $1::jsonb
           WHERE "database" = 'db_novo'`,
         [JSON.stringify(oComEspaco)],
      );
      expect(oResEspaco.rowCount).toBe(1);
      const oLidoEspaco = await oClient!.query<{historico_config: typeof oComEspaco}>(
         `SELECT historico_config
            FROM public.portal_cliente_config
           WHERE "database" = 'db_novo'`,
      );
      expect(oLidoEspaco.rows[0].historico_config.mFases[1]).toBe(' ');
      expect(oLidoEspaco.rows[0].historico_config).toEqual(oComEspaco);

      const oVazio = {lExibir: false, mFases: [] as string[], nPeriodoDias: 30};
      const oResVazio = await oClient!.query(
         `UPDATE public.portal_cliente_config
             SET historico_config = $1::jsonb
           WHERE "database" = 'db_novo'`,
         [JSON.stringify(oVazio)],
      );
      expect(oResVazio.rowCount).toBe(1);

      const cFavicon = 'https://cdn.exemplo.com/portal/favicon.png';
      const oResFavicon = await oClient!.query(
         `UPDATE public.portal_cliente_config
             SET favicon_url = $1
           WHERE "database" = 'db_novo'`,
         [cFavicon],
      );
      expect(oResFavicon.rowCount).toBe(1);
      const oLidoFinal = await oClient!.query<{favicon_url: string | null; historico_config: typeof oVazio}>(
         `SELECT favicon_url, historico_config
            FROM public.portal_cliente_config
           WHERE "database" = 'db_novo'`,
      );
      expect(oLidoFinal.rows[0].favicon_url).toBe(cFavicon);
      expect(oLidoFinal.rows[0].historico_config).toEqual(oVazio);
      await evidenciar(testInfo, 'CT-API-06', {
         historicoComEspaco: oLidoEspaco.rows[0].historico_config,
         historicoVazio: oVazio,
         favicon_url: oLidoFinal.rows[0].favicon_url,
      });
   });

   test('CT-API-07 — Segurança da tabela preservada', async ({}, testInfo) => {
      const oRes = await oClient!.query<{relrowsecurity: boolean}>(
         `SELECT relrowsecurity
            FROM pg_class
           WHERE oid = 'public.portal_cliente_config'::regclass`,
      );
      expect(oRes.rows[0].relrowsecurity).toBe(true);
      await evidenciar(testInfo, 'CT-API-07', {relrowsecurity: oRes.rows[0].relrowsecurity});
   });
});
