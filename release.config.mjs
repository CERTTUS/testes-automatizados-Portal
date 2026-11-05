// release.config.mjs — fases da bateria de release (lido por scripts/release/run-release.mjs)
//
// Produto: Portal do Cliente (portalcliente-web + portalcliente-api). Ferramenta: Playwright, projeto "chromium".
// Cobertura: 21 specs / 115 testes, cada um em UMA fase (nenhum roda duas vezes por padrão).
//
// O Portal tem três "mundos" de dados que NÃO convivem no mesmo ambiente; por isso a bateria é dividida em lanes:
//
//  1) LANE MOCK (padrão, roda sempre) — 59 testes.
//     Exige o portalcliente-web em E2E_BASE_URL (:3000) + o mock-bff do web (`node e2e/mock-bff.mjs`,
//     repo portalcliente-web, porta 3333 = E2E_API_BASE_URL). Os demais testes desta lane usam page.route.
//     Ordem = jornada do portal: smoke → link/preview → login → tema → ordem de serviço → menu da conta.
//
//  2) LANE HISTÓRICO COM STUB (opt-in RELEASE_HISTORICO_STUB=1) — 44 testes (2866 BFF + 2881 API).
//     Exige o portalcliente-api REAL na :3333 apontando o MS para o stub `scripts/qa/stub-ms-portal-historico.mjs`
//     (porta 18881, QA_STUB_MS_URL). Como a :3333 é a mesma do mock-bff, as duas stacks não sobem juntas:
//     por isso fica fora do padrão e vem DEPOIS da lane mock (troque o servidor da :3333 antes de ligar).
//     Roda com --workers=1 porque o stub guarda as requisições em memória (estado global).
//
//  3) LANE HOMOLOG (opt-in RELEASE_HOMOLOG=1) — 32 testes, contra o ambiente de homologação real
//     (PORTAL_E2E_HOMOLOG=1 + massa PORTAL_*_HOMOLOG + TALK_EMAIL/TALK_PASSWORD no .env.local).
//     Alteram dados da empresa 0001 (PATCH de favicon/logo/histórico no Talk), por isso --workers=1 e a
//     aparência do Talk por último. O CT-API do 2881 roda aqui no modo homolog; a fase 'historico-api-stub'
//     roda o MESMO arquivo no modo stub — são modos alternativos, não ligue os dois na mesma bateria.
//
//  4) SQL 2876 (opt-in RELEASE_SQL_LOCAL=1) — 7 testes. Recria um banco no Postgres local (DROP DATABASE)
//     e lê as migrations de ../portalcliente-api (PORTAL_API_REPO). Nunca roda sem pedido explícito.
//
// Fora da bateria: nada — todo spec existente está em alguma fase (padrão ou opt-in).
// Fonte da lista: arquivos reais de tests/. O catálogo scripts/pre-cr/catalogo-modulos.json NÃO foi usado como
// fonte porque lista specs repetidos entre módulos e está incompleto (serve ao pre-CR, não ao release).
//
// Conflito conhecido (decisão do time, os testes não foram alterados): o menu "Boleto" é esperado VISÍVEL em
// CT-SMK-01 (smoke) e CT-E2E-01 do shell-d4, e AUSENTE (0) em CT-E2E-06 do 2881. Um dos dois falha em qualquer
// ambiente até haver decisão — veja docs/melhorias-estrutura.md. Use --continuar para ver as demais fases.

const CHROMIUM = '--project=chromium';
const SPEC_MENU_2881 =
  'tests/e2e/specs/modulo-talk-2881-portal-favicon-historico-menu/CT-E2E-portal-favicon-historico-menu.spec.ts';
const SPEC_TALK_APARENCIA_2881 =
  'tests/e2e/specs/modulo-talk-2881-portal-favicon-historico-menu/CT-E2E-talk-aparencia-imagens.spec.ts';
const SPEC_API_2881 =
  'tests/api/modulo-talk-2881-portal-favicon-historico-menu/CT-API-portal-favicon-historico-menu.spec.ts';

export default {
  produto: 'Portal do Cliente',
  relatorioDir: 'release-report',

  preVoo: {
    arquivosEnv: ['.env.local', '.env'],
    envObrigatorias: [],
    urls: [
      // portalcliente-web (Next, porta 3000 por padrão)
      { nome: 'Portal web', env: 'E2E_BASE_URL', padrao: 'http://localhost:3000', caminho: '/' },
      // Mock BFF (lane mock) ou portalcliente-api real (lane stub/homolog) — ambos expõem /health na :3333
      { nome: 'BFF (mock-bff ou portalcliente-api)', env: 'E2E_API_BASE_URL', padrao: 'http://127.0.0.1:3333', caminho: '/health' },
      // Stub do MS do histórico: só exigido pela lane 'histórico com stub' (opt-in)
      { nome: 'Stub MS histórico (opcional)', env: 'QA_STUB_MS_URL', padrao: 'http://127.0.0.1:18881', caminho: '/__stub/requisicoes', opcional: true },
      // Talk de homologação: só exigido pela lane homolog (opt-in)
      { nome: 'Talk homolog (opcional)', env: 'TALK_BASE_URL', padrao: 'http://34.195.122.141:8081', caminho: '/', opcional: true },
    ],
    pastasTestes: ['tests'],
    proibirOnly: true,
  },

  envPadrao: {
    PW_MAX_FAILURES: '1', // stop-on-fail dentro de cada fase (0 desliga)
    PRE_CR: '0', // PRE_CR=1 liga vídeo/trace/slowMo e workers=1: não é o modo da bateria
    // Headless: o playwright.config.ts já roda sem janela; a bateria nunca passa --headed.
  },

  fases: [
    // ───────────── Lane mock (padrão) ─────────────
    {
      id: 'smoke',
      nome: 'Smoke — landing, login D1, shell autenticado, conteúdo, sem timeline, tema/cache (9 testes)',
      comando: `npx playwright test tests/smoke ${CHROMIUM}`,
    },
    {
      id: 'm1-link-preview',
      nome: 'Link/preview — ícone da aba e fallback CERTTUS (2881: CT-E2E-01 e 09)',
      comando: `npx playwright test ${SPEC_MENU_2881} ${CHROMIUM} --grep "CT-E2E-0[19] "`,
    },
    {
      id: 'm2-login',
      nome: 'Login — API landing + login D1 + a11y e regressão (2638 API, 2667, 2668)',
      comando: `npx playwright test tests/api/modulo-talk-2638 tests/e2e/specs/modulo-talk-2667-login-d1 tests/e2e/specs/modulo-talk-2668-d1-testes ${CHROMIUM}`,
    },
    {
      id: 'm3-tema',
      nome: 'Tema — enrich Supabase (API) + landing tema + tema na UI (2770, 2666)',
      comando: `npx playwright test tests/api/modulo-talk-2770 tests/e2e/specs/modulo-talk-2666-landing-tema tests/e2e/specs/modulo-talk-2770-ms-supabase-config ${CHROMIUM}`,
    },
    {
      id: 'm4-ordem-servico',
      nome: 'Ordem de serviço — shell D4, conteúdo e painel de detalhe (2669, 2670, 2671)',
      comando: `npx playwright test tests/e2e/specs/modulo-talk-2669-shell-d4 tests/e2e/specs/modulo-talk-2670-d4-conteudo tests/e2e/specs/modulo-talk-2671-painel-detalhe ${CHROMIUM}`,
    },
    {
      id: 'm6-menu-conta',
      nome: 'Menu da conta — Meus dados, Histórico, Sair, preview (2881 E2E, exceto 01 e 09)',
      comando: `npx playwright test ${SPEC_MENU_2881} ${CHROMIUM} --grep-invert "CT-E2E-0[19] "`,
    },

    // ───────────── Lane histórico com stub (opt-in) ─────────────
    {
      id: 'historico-bff-stub',
      nome: 'Histórico — BFF contra o stub do MS (2866, 17 testes)',
      comando: `npx playwright test tests/api/modulo-talk-2866-bff-historico ${CHROMIUM} --workers=1`,
      optIn: {
        env: 'RELEASE_HISTORICO_STUB',
        motivo: 'precisa do portalcliente-api real na :3333 + stub scripts/qa/stub-ms-portal-historico.mjs no ar (porta 18881); não convive com o mock-bff na :3333',
      },
    },
    {
      id: 'historico-api-stub',
      nome: 'Histórico — favicon/preview, histórico e Meus dados contra o stub (2881 API, 27 testes)',
      comando: `npx playwright test ${SPEC_API_2881} ${CHROMIUM} --workers=1`,
      optIn: {
        env: 'RELEASE_HISTORICO_STUB',
        motivo: 'mesma stack da fase historico-bff-stub (stub 18881); não ligar junto com RELEASE_HOMOLOG, que roda este mesmo arquivo em modo homolog',
      },
    },

    // ───────────── Lane homolog (opt-in) ─────────────
    {
      id: 'homolog-api-2881',
      nome: 'Homolog — favicon/preview, histórico e Meus dados contra o MS real (2881 API)',
      comando: `npx playwright test ${SPEC_API_2881} ${CHROMIUM} --workers=1`,
      env: { PORTAL_E2E_HOMOLOG: '1' },
      optIn: {
        env: 'RELEASE_HOMOLOG',
        motivo: 'roda contra homolog real (PORTAL_E2E_HOMOLOG=1): emite/revoga links e altera config da empresa 0001',
      },
    },
    {
      id: 'homolog-talk-aparencia',
      nome: 'Homolog — Talk › Portal do Cliente: aparência, favicon e logo (2881 E2E, 5 testes)',
      comando: `npx playwright test ${SPEC_TALK_APARENCIA_2881} ${CHROMIUM} --workers=1`,
      env: { PORTAL_E2E_HOMOLOG: '1' },
      optIn: {
        env: 'RELEASE_HOMOLOG',
        motivo: 'faz upload de favicon/logo no Talk de homolog (altera dados da empresa; restaura no fim); vai por último na lane homolog',
      },
    },

    // ───────────── SQL local (opt-in) ─────────────
    {
      id: 'sql-2876',
      nome: 'Contrato SQL — portal_cliente_config favicon/histórico (2876, 7 testes)',
      comando: `npx playwright test tests/api/modulo-talk-2876-config-favicon-historico ${CHROMIUM} --workers=1`,
      optIn: {
        env: 'RELEASE_SQL_LOCAL',
        motivo: 'recria banco no Postgres local (DROP DATABASE) e lê migrations de ../portalcliente-api',
      },
    },
  ],
};
