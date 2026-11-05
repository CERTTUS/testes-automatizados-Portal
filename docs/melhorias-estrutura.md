# Melhorias de estrutura — testes do Portal do Cliente

Análise da suíte na branch `develop` (integração de `historia/TALK-2468-portal-cliente-web`, `test/TALK-2866-ajustes-portal` e `melhoria/TALK-2637`). Todas as evidências foram conferidas no código; onde não deu para conferir está marcado "a confirmar".

## 1. Resumo do estado atual

- **21 specs, 115 testes**: API 57 (5 arquivos), E2E 49 (10), Smoke 9 (6). Um único projeto Playwright (`chromium`), sem `storageState`, `globalSetup` nem `webServer`.
- **Três mundos de dados misturados** na mesma suíte: mock (tokens falsos do `mock-bff` do portalcliente-web), stub do MS (porta 18881) e homolog real — mais um spec SQL que recria banco local. Não existe ambiente em que `npm run test:e2e` passe inteiro.
- **Estrutura por ticket** (`modulo-talk-NNNN`), 16 helpers (alguns nomeados por ticket), 3 Page Objects, 1 fixture. Cinco scripts `test:modulo-talk-*` (mais `…-2881:api` e `…-2881:e2e`) cobrem só parte da suíte.
- **Pre-CR** (`scripts/pre-cr/*`) com catálogo JSON que não reflete a suíte atual (specs órfãos, módulo sem specs) e README desatualizado.
- **Boa base**: nenhum `waitForTimeout` e nenhum `.only`; `data-testid` usado na maior parte dos seletores; títulos com `CT-XXX-NN`; stop-on-fail via `maxFailures`.
- **Bateria de release** nova (`npm run test:release`) agora cobre todos os 115 testes em fases por módulo, com lanes opt-in para stub, homolog e SQL.

## 2. Problemas encontrados

| Severidade | Problema | Evidência (arquivo:linha) | Impacto |
|---|---|---|---|
| Alta | Asserção contraditória sobre o menu Boleto: dois testes esperam **visível**, outro espera **0** | `tests/smoke/modulo-talk-2638/CT-SMK-autenticado.spec.ts:66` (`nav-boleto` visível); `tests/e2e/specs/modulo-talk-2669-shell-d4/shell-d4-portal.spec.ts:26` (`irParaBoleto` clica no menu); `tests/e2e/specs/modulo-talk-2881-portal-favicon-historico-menu/CT-E2E-portal-favicon-historico-menu.spec.ts:97` (`toHaveCount(0)`) | Pelo menos um falha sempre; a release nunca fica verde. Bug de produto ou teste desatualizado — decisão do time |
| Alta | `npm run test:e2e` roda tudo junto, inclusive o spec SQL (`DROP DATABASE`) e specs que exigem stub/homolog | `package.json` script `test:e2e` (`playwright test --project=chromium`); `CT-API-config-favicon-historico.spec.ts:11-12` (admin do Postgres e repo da API); `tests/api/modulo-talk-2866-bff-historico/historicoStub.ts:14` (stub 18881) | Falhas por ambiente, risco de rodar SQL destrutivo sem querer |
| Alta | Mock-bff e portalcliente-api real usam a mesma porta (3333); lanes diferentes não convivem | `tests/e2e/helpers/env.ts:6` (`E2E_API_BASE_URL`); `CT-API-bff-historico.spec.ts` e `CT-API-portal-favicon-historico-menu.spec.ts` usam a API real + stub, os demais usam o mock | Troca manual de servidor entre fases; fácil errar |
| Alta | Corrida em dados de homolog com `fullyParallel: true` | `playwright.config.ts:42` (`fullyParallel`); `tests/e2e/helpers/portal/talkPortalConfigApi.ts:83-95` (PATCH favicon/histórico na empresa 0001); `CT-E2E-talk-aparencia-imagens.spec.ts` (upload na mesma empresa) | Flake em homolog quando os dois rodam juntos |
| Média | Login por celular reimplementado 7 vezes, sem Page Object | `tests/e2e/helpers/portal/d1LoginHelpers.ts:47`; `landingTemaHelpers.ts:46`; `shellD4Helpers.ts:102` e `:164`; `portal2881Helpers.ts:176` e `:196`; `tests/e2e/specs/modulo-talk-2667-login-d1/login-d1-portal.spec.ts:36` | Mudou o formulário, 7 lugares para ajustar |
| Média | Relogin em todo teste | `loginPortal2881` usado 10 vezes no spec do menu (`CT-E2E-portal-favicon-historico-menu.spec.ts`); login UI do Talk a cada teste (`autenticarSeNecessario`, com sondagem de até 5 s, em `tests/e2e/pages/TalkPortalClientePage.ts:72-91`) | Lentidão: cada um dos 5 testes do Talk refaz o login completo |
| Média | Seletores CSS nos specs (frágeis a deploy) | `a11y-portal.spec.ts:43-44` (`.acesso-alerta-erro`); `CT-SMK-landing.spec.ts:11` (`.acesso-marca__nome`); `CT-SMK-d1-login.spec.ts:23,32-36` (`.acesso-form-inner`, `.acesso-painel-hero--com-imagem`) | Quebra se a classe mudar; foge da prioridade `data-testid` → aria → role |
| Média | Domínio do cookie fixo em `localhost` | `CT-SMK-autenticado.spec.ts:45`, `CT-SMK-05-d4-conteudo.spec.ts:48`, `CT-SMK-06-sem-timeline.spec.ts:43`, `tests/e2e/helpers/portal/d4ConteudoHelpers.ts:11`; já existe `dominioCookiePortal()` em `shellD4Helpers.ts:111-115` | Falha se `E2E_BASE_URL` usar `127.0.0.1` ou outro host |
| Média | IPs de homolog como padrão no código | `tests/e2e/helpers/env.ts:10` (Talk); `tests/e2e/helpers/portal/portalLinkHomolog.ts:13` (MS); `massaPortal2881.ts:23` (`/34\.195\.122\.141/` liga o modo homolog) | Rodar sem `.env` aponta para homolog por engano; IP muda → vários arquivos |
| Média | Catálogo pre-CR incompleto e inconsistente | `scripts/pre-cr/catalogo-modulos.json`: `landing-tema-portal.spec.ts` (2666) não aparece em nenhum módulo; o módulo 2671 lista só o smoke (sem `painel-detalhe-portal.spec.ts`); `modulo-talk-2640` com `"specs": []`; `CT-API-landing.spec.ts` e smokes repetidos em vários módulos | Pre-CR não roda/evidencia specs existentes; contagens duplicadas |
| Média | `.env.example` incompleto | Faltam (usadas no código): `PORTAL_SQL_ADMIN_URL`, `PORTAL_API_REPO`, `QA_STUB_MS_URL`/`QA_STUB_MS_PORTA`, `PORTAL_TOKEN_OK`, `PORTAL_TELEFONE_AUTORIZADO`, `PORTAL_EMPRESA_HOMOLOG`, `TALK_API_URL`, `PW_MAX_FAILURES`, `E2E_SLOW_MO` | Quem entra no projeto não sabe que variáveis existem |
| Baixa | `serial` desnecessário na a11y | `tests/e2e/specs/modulo-talk-2668-d1-testes/a11y-portal.spec.ts:20` | Os 10 testes não compartilham estado; `serial` impede paralelismo e para tudo na 1ª falha |
| Baixa | Pasta de smoke com nome de um ticket guarda specs de vários | `tests/smoke/modulo-talk-2638/` contém smokes de 2666, 2667, 2669, 2670 e 2671 | Difícil achar o teste pelo ticket |
| Baixa | `CT-SMK-01` existe em três arquivos | `CT-SMK-landing.spec.ts:6`, `CT-SMK-autenticado.spec.ts:40`, `tests/smoke/modulo-talk-2770/CT-SMK-tema-cache.spec.ts:7` (mesmo para `CT-API-01`/`CT-E2E-01`, repetidos por módulo) | Evidência por CT-ID ambígua; relatório confuso |
| Baixa | `navBoleto` duplicado em dois Page Objects | `tests/e2e/pages/ShellD4PortalPage.ts:18`; `tests/e2e/pages/PortalFaviconHistoricoPage.ts:22` | Divergência de seletor |
| Baixa | Helpers nomeados por ticket | `portal2881Helpers.ts`, `massaPortal2881.ts`, `t2770EnrichHelpers.ts` | Nome não diz a responsabilidade |
| Baixa | ~4 MB de zips de evidência versionados | `evidencias-pr/**/zips/*.zip` (5 arquivos) | Repo cresce a cada PR |
| Baixa | Documentação desatualizada | `README.md` diz "catálogo vazio" e "Estrutura … criados no hop Dev"; `tests/e2e/specs/README.md` diz "Vazio no esqueleto" | Confunde novatos |
| Baixa | Tokens do mock podem estar fora de sincronia com o `mock-bff` (a confirmar) | `portalFixtures.ts` define `tokFailOpenConfigXXX` e `tokAbasFiltradasXXXX` (CT-API-05/06 do 2770); esses tokens **não aparecem** em `e2e/mock-bff.mjs` no clone local do portalcliente-web (branch `test/TALK-2982-data-testid`) | Se a branch do web usada na release não os tiver, o 2770 API falha |

## 3. Sugestões priorizadas

### P0 — fazer já (risco baixo de quebra)

| Item | O quê | Por quê | Risco | Esforço |
|---|---|---|---|---|
| P0-1 | **Decidir o Boleto** com o time de produto e ajustar o lado errado (teste ou produto) | Deixa a release verde de forma legítima | Baixo | P |
| P0-2 | **Separar as lanes mock / homolog** em projetos Playwright (ou tags `@mock` / `@homolog` / `@stub` / `@sql`), cada uma com seu `testMatch` | Elimina a mistura de mundos; hoje a separação existe só no `release.config.mjs` | Baixo (aditivo) | M |
| P0-3 | **Serializar o que altera homolog** (`test.describe.configure({mode: 'serial'})` já existe em parte; garantir `workers: 1` no projeto homolog) e deixar o Talk config por último | Remove a corrida descrita na seção 2 | Baixo | P |
| P0-4 | **Tirar o SQL 2876 e o link-409 do `test:e2e`**; manter `test:e2e` = lane mock | Evita `DROP DATABASE` acidental e falhas por ambiente | Baixo | P |
| P0-5 | **Completar o `.env.example`** com as variáveis listadas na seção 2 | Onboarding | Nenhum | P |
| P0-6 | **Integrar `test/IN-911-mascara-telefone` e `test/URG-10463-portal-link-409-ctoken`** à develop resolvendo os conflitos (ver "Pendências de integração") | A develop está incompleta | Médio (conflitos de config) | M |
| P0-7 | **Fechar/retargetar os PRs #2, #3 e #4** (abertos contra `main`) para a `develop` | Fluxo de branches novo (develop → main só em release) | Nenhum | P |
| P0-8 | Atualizar `README.md` e os READMEs de `tests/e2e/specs` e `tests/e2e/pages` | Docs mentem sobre o estado do repo | Nenhum | P |

### P1 — próximo ciclo (risco médio)

| Item | O quê | Por quê | Risco | Esforço |
|---|---|---|---|---|
| P1-1 | **Um único Page Object de acesso** (partir de `AcessoPortalPage` da IN-911) com `loginPorCelular()` + fixture `portalAutenticado` em `tests/e2e/fixtures.ts` | Substitui os 7 logins | Médio (muitos specs tocados) | M |
| P1-2 | **`storageState` para o Talk** (projeto `setup` que loga uma vez e grava `.auth/`, já no `.gitignore`) | Elimina o login do Talk repetido a cada teste | Médio | M |
| P1-3 | **`data-testid` no lugar de CSS** (`acesso-alerta-erro`, `acesso-marca-nome`, hero, etc.): PR no portalcliente-web **somente com o atributo** + troca nos specs | Estabilidade | Médio (depende de PR no web) | M |
| P1-4 | **Derivar o domínio do cookie da `baseURL`** em todos os pontos (reusar `dominioCookiePortal()`) | Funciona com `127.0.0.1`/outros hosts | Baixo | P |
| P1-5 | **Corrigir o catálogo pre-CR** (incluir 2666, completar 2671, tirar `modulo-talk-2640` vazio, remover repetições) e **gerar o catálogo da bateria a partir de uma fonte única** | Pre-CR e release com a mesma lista | Médio | M |
| P1-6 | **Reporter JSON/`junit`** além do `html` e saída por fase em `release-report/` | Integração com CI e histórico | Baixo | P |
| P1-7 | Remover o `serial` da a11y (`a11y-portal.spec.ts:20`) | Mais rápido, falhas independentes | Baixo | P |
| P1-8 | Mover IPs/URLs de homolog para `.env` (sem padrão no código) e falhar com mensagem clara se faltar | Evita rodar contra homolog sem querer | Médio | P |
| P1-9 | Fazer o `mock-bff` do portalcliente-web conter todos os tokens de `portalFixtures.ts` (e vice-versa); teste simples que compara as listas | Garante paridade mock × fixtures | Baixo | P |

### P2 — longo prazo

| Item | O quê | Por quê | Risco | Esforço |
|---|---|---|---|---|
| P2-1 | **Reorganizar por funcionalidade** (acesso, tema, ordem-servico, historico, conta, talk-config) com o ticket só em tag (`@TALK-2881`) | Achar teste pelo assunto, não pelo ticket | Médio (renomeia arquivos; ajustar catálogo e scripts) | G |
| P2-2 | **CT-IDs únicos** (`CT-<MODULO>-NN`) | Evidência e relatório sem ambiguidade | Médio | M |
| P2-3 | **Tirar os zips de evidência do git** (artefatos de PR / storage externo) | Repo leve | Baixo | M |
| P2-4 | Stack de teste única e reprodutível: um comando (`docker compose` ou script) que sobe web + BFF + stubs para cada lane | Fim da troca manual na porta 3333 | Médio | G |
| P2-5 | Rodar a lane mock em CI a cada PR e a bateria completa por agendamento | Feedback antes da release | Médio | M |

## 4. Estrutura de pastas alvo

```text
tests/
├── acesso/            # login, landing, a11y, link revogado
├── tema/              # tema/landing, enrich Supabase
├── ordem-servico/     # shell, conteúdo, painel de detalhe
├── historico/         # BFF, histórico, Meus dados
├── conta/             # menu da conta, sair, favicon/aba
├── talk-config/       # Talk › Portal do Cliente (aparência, favicon, logo)
├── contrato-sql/      # 2876 (opt-in)
└── support/
    ├── pages/         # AcessoPortalPage, ShellPortalPage, TalkPortalClientePage…
    ├── helpers/       # rede/mock, massa, env
    └── fixtures.ts
```

| De | Para |
|---|---|
| `tests/api/modulo-talk-2638/` | `tests/acesso/` (API da landing) |
| `tests/smoke/modulo-talk-2638/` | dividir em `tests/acesso/`, `tests/ordem-servico/` conforme o assunto |
| `tests/e2e/specs/modulo-talk-2667-login-d1/`, `…-2668-d1-testes/` | `tests/acesso/` |
| `tests/e2e/specs/modulo-talk-2666-landing-tema/`, `…-2770-ms-supabase-config/`, `tests/api/modulo-talk-2770/` | `tests/tema/` |
| `tests/e2e/specs/modulo-talk-2669-…`, `…-2670-…`, `…-2671-…` | `tests/ordem-servico/` |
| `tests/api/modulo-talk-2866-bff-historico/`, `tests/api/modulo-talk-2881-…/` | `tests/historico/` |
| `tests/e2e/specs/modulo-talk-2881-…/CT-E2E-portal-favicon-historico-menu.spec.ts` | `tests/conta/` |
| `tests/e2e/specs/modulo-talk-2881-…/CT-E2E-talk-aparencia-imagens.spec.ts` | `tests/talk-config/` |
| `tests/api/modulo-talk-2876-…/` | `tests/contrato-sql/` |
| `tests/e2e/pages/`, `helpers/`, `fixtures.ts` | `tests/support/…` |

Só migrar depois de P0-2 (lanes) e P1-5 (catálogo/fonte única); a migração mexe em `testMatch`, catálogo, scripts `test:modulo-*` e `release.config.mjs`.

## 5. Padrões de escrita propostos

| Tema | Padrão |
|---|---|
| Arquivo | `<assunto>.spec.ts` em kebab-case, dentro da pasta da funcionalidade |
| Título | `CT-<MODULO>-NN — descrição` (ex.: `CT-ACESSO-03 — Telefone não autorizado exibe alerta`), NN único por módulo |
| Idioma | Títulos, mensagens de `expect` e comentários em pt-BR; identificadores no padrão atual (`cNome`, `lFlag`, `oObjeto`, `mLista`, `C_CONSTANTE`) |
| Tags | `@mock`, `@stub`, `@homolog`, `@sql`, `@smoke`, `@a11y` e o ticket (`@TALK-2881`) — a lane e a tag comandam a fase da bateria |
| Organização | Por funcionalidade; ticket só em tag/anotação (evita renomear pasta a cada história) |
| Seletores | `data-testid` → `aria-label` → `role`; classe CSS proibida |
| Page Object | Um por tela/área; spec só orquestra; sem login copiado |
| Dados | Tokens/telefones em `portalFixtures.ts`; massa de homolog com `restaurar()` no `afterAll` |
| Skip × fail | `pularSeNaoAplicavel` só para "sem massa/ambiente"; nunca para esconder bug |

## 6. Velocidade e estabilidade

| Causa | Efeito | Como resolver |
|---|---|---|
| Login repetido (7 implementações; `loginPortal2881` em 10 testes; login do Talk a cada teste) | Cada teste paga o login | Fixture `portalAutenticado` e `storageState` do Talk (P1-1, P1-2) |
| Login completo do Talk em cada teste, com sondagem de até 5 s (`TalkPortalClientePage.ts:72-91`) | Tempo e carga no Talk de homolog | `storageState` do Talk grava a sessão uma vez; a sondagem passa a ser desnecessária |
| Corrida em dados de homolog (`fullyParallel`) | Flake | `workers: 1` no projeto homolog + `serial` onde há massa compartilhada (P0-3) |
| Mundos misturados | Falha por ambiente, não por produto | Lanes/tags e `test:e2e` só com a lane mock (P0-2, P0-4) |
| `serial` em a11y | Perde paralelismo | Remover (P1-7) |
| Stub com estado global em memória (`/__stub/requisicoes`) | Testes de arquivos diferentes interferem se rodarem juntos | Manter `--workers=1` nas fases de stub (já na bateria) ou isolar por cabeçalho de correlação (P2) |
| `retries: 0` localmente, 2 em CI | Flake aparece só em CI | Aceitável; usar `--retries` pontual e investigar traces |
| Apenas `maxFailures: 1` | Uma falha esconde as demais | Bateria tem `--continuar` para diagnóstico; `PW_MAX_FAILURES=0` por fase |
| Troca manual da porta 3333 | Erro humano | Script que sobe cada stack (P2-4) |

## Pendências de integração

Ficaram **fora** da develop porque conflitam; entram depois por PR:

- `test/IN-911-mascara-telefone` — conflito em `scripts/pre-cr/catalogo-modulos.json`. Traz `AcessoPortalPage` (base do P1-1).
- `test/URG-10463-portal-link-409-ctoken` — conflitos em `package.json`, `package-lock.json`, `playwright.config.ts` e no catálogo. **Cuidado com a config:** essa branch parte de `testDir './tests/e2e'` e `testMatch '**/specs/**'`. Se a resolução do conflito ficar com a versão dela, `tests/api` e `tests/smoke` **deixam de rodar** (a develop usa `testDir './tests'` com `api/**`, `smoke/**`, `e2e/specs/**`). Resolver mantendo os três padrões e adicionar o spec do link-409 a uma fase do `release.config.mjs` (fora do `test:e2e` padrão, conforme P0-4).
- PRs abertos contra `main`: #2 (`historia/TALK-2468-portal-cliente-web`), #3 (`melhoria/TALK-2637`), #4 (`test/URG-10463-portal-link-409-ctoken`) — retargetar para a `develop` ou fechar (P0-7).
