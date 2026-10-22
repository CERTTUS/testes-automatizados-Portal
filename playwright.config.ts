import {defineConfig, devices} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function carregarArquivoEnv(cNomeArquivo: string): void {
   const cCaminho = path.resolve(process.cwd(), cNomeArquivo);
   if (!fs.existsSync(cCaminho)) {
      return;
   }
   for (const cLinha of fs.readFileSync(cCaminho, 'utf8').split(/\r?\n/)) {
      const cTrim = cLinha.trim();
      if (!cTrim || cTrim.startsWith('#')) continue;
      const nIgual = cTrim.indexOf('=');
      if (nIgual <= 0) continue;
      const cChave = cTrim.slice(0, nIgual).trim();
      const cValor = cTrim.slice(nIgual + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[cChave] === undefined) {
         process.env[cChave] = cValor;
      }
   }
}

carregarArquivoEnv('.env.local');
carregarArquivoEnv('.env');

/* Id da execução (módulo portal-link-409-ctoken): definido no processo principal, herdado pelos workers.
   Escopo do registro ".portal-state/os-criadas/<runId>" — a guarda só aceita OS criadas nesta execução. */
process.env.PORTAL_RUN_ID ??= `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;

const L_PRE_CR = process.env.PRE_CR === '1';
const L_USAR_CHROME_INSTALADO = !process.env.CI && process.env.E2E_USE_CHROMIUM !== '1';

function useNavegadorE2e() {
   const oPerfil = devices['Desktop Chrome'];
   if (!L_USAR_CHROME_INSTALADO) {
      return oPerfil;
   }
   return {
      ...oPerfil,
      channel: 'chrome' as const,
   };
}

export default defineConfig({
   testDir: './tests/e2e',
   fullyParallel: true,
   forbidOnly: !!process.env.CI,
   retries: process.env.CI ? 2 : 0,
   /* Stop-on-fail da bateria (Harness qa-bateria-falha). PW_MAX_FAILURES=0 desliga. */
   maxFailures: (() => {
      const nBruto = process.env.PW_MAX_FAILURES?.trim();
      if (nBruto === '0') return 0;
      const n = Number(nBruto ?? '1');
      return Number.isFinite(n) && n > 0 ? n : 1;
   })(),
   workers: process.env.CI ? 1 : undefined,
   timeout: 45_000,
   reporter: process.env.E2E_REPORTER_LISTA === '1'
      ? [
           ['list', {printSteps: true}],
           ['html', {open: 'never'}],
        ]
      : [['list'], ['html', {open: 'never'}]],
   use: {
      baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
      trace: L_PRE_CR ? 'retain-on-failure' : 'on-first-retry',
      screenshot: 'only-on-failure',
      video: L_PRE_CR
         ? {mode: 'on' as const, size: {width: 1280, height: 720}}
         : 'retain-on-failure',
      launchOptions: {
         slowMo: Number(process.env.E2E_SLOW_MO ?? (L_PRE_CR ? 1200 : 0)),
      },
      actionTimeout: 15_000,
      navigationTimeout: 45_000,
   },
   projects: [
      {
         name: 'chromium',
         testMatch: '**/specs/**/*.spec.ts',
         // portal-link-409-ctoken tem projeto próprio (precisa de setup/teardown da flag do Portal).
         testIgnore: '**/specs/portal-link-409-ctoken/**',
         use: useNavegadorE2e(),
      },
      /* Módulo portal-link-409-ctoken (URG-10463): flag do Portal + sonda do banco da API, 1x por execução. */
      {
         name: 'portal-link-409-setup',
         testMatch: '**/specs/portal-link-409-ctoken/_ambiente/flag.setup.ts',
         teardown: 'portal-link-409-teardown',
      },
      {
         name: 'portal-link-409-teardown',
         testMatch: '**/specs/portal-link-409-ctoken/_ambiente/flag.teardown.ts',
      },
      {
         name: 'portal-link-409',
         testMatch: '**/specs/portal-link-409-ctoken/*.spec.ts',
         dependencies: ['portal-link-409-setup'],
         use: useNavegadorE2e(),
      },
   ],
});
