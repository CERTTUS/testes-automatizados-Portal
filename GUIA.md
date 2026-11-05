# GUIA — testes automatizados do Portal do Cliente

Guia de onboarding para quem **nunca usou** este repositório: instalar, configurar, rodar e criar testes. Comandos em PowerShell (Windows) primeiro; bash quando for diferente.

---

## 1. O que é este repositório

Suíte de testes automatizados do **Portal do Cliente** CERTTUS — o site em que o cliente de uma oficina recebe um link (WhatsApp), informa o celular, vê a ordem de serviço (OS), o histórico e seus dados. Produto testado:

- **portalcliente-web** (Next.js, porta `3000`): telas de acesso/login, tema da oficina, painel da OS, menu da conta, histórico.
- **portalcliente-api** (BFF, porta `3333`): landing do link, sessão por celular, detalhe da OS, histórico, "Meus dados".
- Configuração do portal feita no **Talk** (Talk › Portal do Cliente: aparência, favicon, logo, histórico).

Ferramenta: **Playwright + TypeScript**, um único projeto (`chromium`). Tipos de teste (pastas em `tests/`):

| Tipo | Pasta | O que é |
|---|---|---|
| API | `tests/api/` | Chamadas HTTP ao BFF (e um contrato SQL do Postgres) |
| Smoke | `tests/smoke/` | Verificações rápidas de tela e de contrato |
| E2E | `tests/e2e/specs/` | Jornadas no navegador (login, OS, menu da conta, Talk) |

Ao todo: **21 specs, 115 testes** (API 57, E2E 49, Smoke 9).

## 2. Pré-requisitos

| Item | Detalhe |
|---|---|
| Node.js | 18 ou superior (versão mínima exata: a confirmar; o repo foi validado com Node 22) |
| npm | o que acompanha o Node |
| Git | para clonar/branches |
| Google Chrome instalado | o config usa o canal `chrome` fora de CI (veja `E2E_USE_CHROMIUM` abaixo para usar o Chromium do Playwright) |
| Repos irmãos | `portalcliente-web` e `portalcliente-api`, clonados **ao lado** deste (`..\portalcliente-web`, `..\portalcliente-api`) |

Serviços que precisam estar no ar, conforme o que você vai rodar:

| Serviço | Porta | Quando é necessário |
|---|---|---|
| portalcliente-web | `3000` | sempre (toda a bateria padrão) |
| mock-bff do web (`e2e/mock-bff.mjs`) | `3333` | lane **mock** (padrão) |
| portalcliente-api real | `3333` | lane **histórico com stub** e lane **homolog** (no lugar do mock-bff) |
| stub do MS do histórico (`scripts/qa/stub-ms-portal-historico.mjs`) | `18881` | lane histórico com stub |
| Postgres local (superusuário) | `5432` | só o spec SQL 2876 (opt-in) |
| Talk de homologação + MS de homologação | `8081` / `8085` | só a lane homolog (opt-in) |

> A porta `3333` é **a mesma** para o mock-bff e para o portalcliente-api real: nunca suba os dois juntos. Veja a seção 8.

Acessos: usuário do Talk de homologação (`TALK_EMAIL` / `TALK_PASSWORD`) e chave do MS de homologação (`PORTAL_MS_HOMOLOG_CHAVEAPI`) — só para a lane homolog. Peça ao time de QA; **nunca** commite.

## 3. Instalação passo a passo

```powershell
# 1. Clonar (e entrar na develop)
git clone <url-deste-repo> testes-automatizados-Portal
cd testes-automatizados-Portal
git switch develop

# 2. Dependências
npm install

# 3. Navegadores do Playwright
npx playwright install chromium
npx playwright install chrome

# 4. Arquivo de ambiente
copy .env.example .env.local
```

bash: troque `copy` por `cp .env.example .env.local`.

## 4. Configurar o ambiente

O `playwright.config.ts` lê `.env.local` e depois `.env` (valores já definidos no ambiente têm prioridade). Ambos estão no `.gitignore`. O arquivo modelo é `.env.example`.

| Variável | Para que serve | Obrigatória? | Exemplo (sem segredo) |
|---|---|---|---|
| `E2E_BASE_URL` | URL do portalcliente-web | Não (padrão `http://localhost:3000`) | `http://localhost:3000` |
| `E2E_API_BASE_URL` | URL do BFF (mock-bff ou portalcliente-api) | Não (padrão `http://127.0.0.1:3333`) | `http://127.0.0.1:3333` |
| `QA_STUB_MS_URL` / `QA_STUB_MS_PORTA` | Onde está / em que porta sobe o stub do histórico | Só lane stub (padrão `http://127.0.0.1:18881`) | `http://127.0.0.1:18881` |
| `PORTAL_E2E_HOMOLOG` | `1` liga o modo homolog nos specs do 2881 (também liga se `E2E_BASE_URL` apontar para o IP de homolog) | Só lane homolog | `1` |
| `PORTAL_TOKEN_HOMOLOG` | Token do link real da OS de teste | Só homolog | (peça ao QA) |
| `PORTAL_TELEFONE_HOMOLOG` | Celular autorizado dessa OS | Só homolog | `5511...` |
| `PORTAL_TOKEN_SEM_FAVICON` | Link de oficina sem favicon | Opcional | (peça ao QA) |
| `PORTAL_TOKEN_REVOGADO_HOMOLOG` | Link revogado fixo (senão a suíte emite um) | Opcional | (peça ao QA) |
| `PORTAL_OS_HISTORICO_HOMOLOG`, `PORTAL_OS_HISTORICO_SERIE_HOMOLOG` | Outra OS do mesmo cliente, usada na massa de histórico | Só homolog | (peça ao QA) |
| `PORTAL_MS_HOMOLOG_URL`, `PORTAL_MS_HOMOLOG_CHAVEAPI`, `PORTAL_MS_HOMOLOG_DATABASE` | MS de homologação (emitir/revogar links) | Só homolog | URL no `.env.example` |
| `PORTAL_EMPRESA_HOMOLOG` | Empresa da massa | Não (padrão `0001`) | `0001` |
| `PORTAL_FAVICON_URL_EXISTENTE` | URL de favicon esperada | Opcional | — |
| `TALK_BASE_URL`, `TALK_API_URL` | Talk de homologação (`TALK_API_URL` deriva de `TALK_BASE_URL` trocando `:8081` por `:8080`) | Só homolog | URL no `.env.example` |
| `TALK_EMAIL`, `TALK_PASSWORD` | Login no Talk | Só homolog | (peça ao QA) |
| `PORTAL_TOKEN_OK`, `PORTAL_TELEFONE_AUTORIZADO` | Sobrescrevem o token e o celular do mock | Opcional | — |
| `PORTAL_SQL_ADMIN_URL` | Conexão admin do Postgres local (spec SQL) | Só SQL 2876 | `postgres://postgres@localhost:5432/postgres` |
| `PORTAL_API_REPO` | Caminho do portalcliente-api (migrations do spec SQL) | Só SQL 2876 (padrão `../portalcliente-api`) | `../portalcliente-api` |
| `PW_MAX_FAILURES` | Para a execução após N falhas (`0` desliga). Padrão 1 | Não | `1` |
| `E2E_USE_CHROMIUM` | `1` usa o Chromium do Playwright em vez do Chrome instalado | Não | `1` |
| `E2E_SLOW_MO` | Atraso (ms) entre ações, bom para assistir | Não | `300` |
| `E2E_REPORTER_LISTA` | `1` mostra os passos (`printSteps`) no terminal | Não | `1` |
| `PRE_CR` | `1` liga vídeo/trace completos e `workers=1` (o `npm run test:pre-cr` define sozinho) | Não | — |

Variáveis de bateria de release (`RELEASE_*`) estão na seção 8.

## 5. Primeiro teste em 5 minutos

1. Suba o portalcliente-web e o mock-bff (veja a seção 7, "Subir o ambiente da lane mock").
2. Rode o smoke de landing:

```powershell
npx playwright test tests/smoke/modulo-talk-2638/CT-SMK-landing.spec.ts --project=chromium
```

Deu certo quando o terminal termina com `3 passed` e nenhuma linha `failed`. Se aparecer `ECONNREFUSED` ou o teste não achar `acesso-cabecalho-marca`, o web ou o mock-bff não está no ar (seção 12).

## 6. Estrutura de pastas

```text
.
├── playwright.config.ts          # config única (projeto chromium, maxFailures, reporters)
├── release.config.mjs            # fases da bateria de release
├── qa-pre-cr.json                # manifesto lido pelo Harness (pre-CR)
├── .env.example                  # modelo de ambiente (copie para .env.local)
├── assets/images/                # imagens usadas no upload de favicon/logo
├── docs/tests/                   # artefatos locais do pre-CR (ignorado, exceto README)
├── evidencias-pr/                # evidências do pre-CR (zips versionados na PR)
├── scripts/
│   ├── release/run-release.mjs   # executor da bateria (igual em todos os repos CERTTUS)
│   ├── pre-cr/                   # fluxo QA_PRE_CR: catálogo, empacotar evidências, corpo da PR
│   ├── qa/                       # stubs do MS (histórico :18881, landing :8087)
│   └── run-test-dev.mjs          # atalho do Harness
└── tests/
    ├── api/modulo-talk-NNNN/     # specs HTTP/SQL
    ├── smoke/modulo-talk-NNNN/   # smokes
    └── e2e/
        ├── specs/modulo-talk-NNNN-…/  # specs de jornada
        ├── pages/                # Page Objects (ShellD4PortalPage, PortalFaviconHistoricoPage, TalkPortalClientePage)
        ├── helpers/              # env, tokens/fixtures, mocks de rede, pre-cr/ (evidências)
        └── fixtures.ts           # `test` estendido (evidência automática quando PRE_CR=1)
```

Nota: a pasta `tests/smoke/modulo-talk-2638/` guarda também smokes de outros tickets (2666, 2667, 2669, 2670, 2671) — o nome da pasta é histórico.

## 7. Como rodar

### Subir o ambiente da lane mock (padrão)

```powershell
# terminal 1 — mock do BFF (repo portalcliente-web)
cd ..\portalcliente-web
node e2e/mock-bff.mjs                     # escuta em http://127.0.0.1:3333

# terminal 2 — portal web apontando para o mock
cd ..\portalcliente-web
$env:PORT = "3000"; $env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:3333"; npm run dev
```

(bash: `PORT=3000 NEXT_PUBLIC_API_URL=http://127.0.0.1:3333 npm run dev`.) Esses comandos espelham o `webServer` do `playwright.config.ts` do portalcliente-web.

Para a lane **histórico com stub**: pare o mock-bff; suba o stub (`node scripts/qa/stub-ms-portal-historico.mjs`, neste repo); suba o `portalcliente-api` na `3333` com `API_MICROSERVICOS_BASE_URL=http://127.0.0.1:18881` (o cliente do MS acrescenta `/api/v1`) e mantenha o web com `NEXT_PUBLIC_API_URL=http://127.0.0.1:3333`.

### Rodar testes

| Quero rodar | Comando |
|---|---|
| 1 teste (por título) | `npx playwright test --project=chromium -g "CT-SMK-02"` |
| 1 arquivo | `npx playwright test tests/e2e/specs/modulo-talk-2669-shell-d4/shell-d4-portal.spec.ts --project=chromium` |
| 1 módulo (scripts existentes) | `npm run test:modulo-talk-2669` · `…-2670` · `…-2671` · `…-2668` · `…-2881` (e `…-2881:api` / `…-2881:e2e`) |
| Uma pasta | `npx playwright test tests/e2e/specs/modulo-talk-2667-login-d1 --project=chromium` |
| Tudo do projeto | `npm run test:e2e` — **atenção:** inclui SQL (`DROP DATABASE`) e specs que exigem stub/homolog; não existe ambiente em que tudo passe junto. Para liberação use `npm run test:release` |
| Só listar, sem executar | `npx playwright test --list` |
| Modo visual | `npm run test:e2e:headed` |
| Debug passo a passo | `npm run test:e2e:debug` (abre o Playwright Inspector) |
| Passos no terminal | `$env:E2E_REPORTER_LISTA = "1"` antes do comando |
| Evidências completas (vídeo/trace) | `$env:PRE_CR = "1"` antes do comando (força `workers=1` e `slowMo` 400 ms) |

Pre-CR (fluxo do Harness, gera evidências por módulo):

```powershell
npm run pre-cr:modulos                                              # lista os módulos do catálogo
npm run test:pre-cr -- --modulo <slug> --dev-key X --parent-key Y   # roda o módulo e coleta evidências
```

Os módulos e specs vêm de `scripts/pre-cr/catalogo-modulos.json`.

### Onde ver resultados

| O que | Onde |
|---|---|
| Relatório HTML | `npx playwright show-report` (pasta `playwright-report/`) |
| Screenshot, vídeo e trace de falhas | `test-results/` (vídeo `retain-on-failure`; trace na 1ª repetição, que localmente não ocorre porque `retries` é 0 — use `PRE_CR=1` para ter trace) |
| Evidências do pre-CR | `evidencias-pr/<chave-pai>/<chave-dev>/runs/atual/` e `zips/` |
| Relatório da bateria de release | `release-report/<data-hora>/resumo.md` |

Todas essas pastas (menos os zips de `evidencias-pr`) estão no `.gitignore`.

## 8. Bateria de release

`npm run test:release` roda **todas as fases obrigatórias**, em ordem, parando na primeira que falhar. As fases estão em `release.config.mjs`; o executor é `scripts/release/run-release.mjs`.

```powershell
npm run test:release:listar                       # mostra as fases e o que seria pulado
npm run test:release                              # bateria completa (lane mock)
npm run test:release -- --de=m4-ordem-servico     # retoma a partir de uma fase
npm run test:release -- --so=smoke,m2-login       # só estas fases
npm run test:release -- --pular=m1-link-preview   # pula fases
npm run test:release -- --continuar               # não para na 1ª falha (útil para ver tudo que quebra)
```

### Fases

Contagens verificadas com `npx playwright test … --list`.

| # | id | O que cobre | Testes | Padrão? |
|---|---|---|---|---|
| 1 | `smoke` | Todos os smokes (landing, login D1, shell autenticado, conteúdo D4, sem timeline, tema/cache) | 9 | sim |
| 2 | `m1-link-preview` | Ícone da aba e fallback CERTTUS (2881 CT-E2E-01 e 09) | 2 | sim |
| 3 | `m2-login` | API da landing (2638), login D1 (2667), a11y e regressão (2668) | 18 | sim |
| 4 | `m3-tema` | Enrich Supabase (API 2770), landing/tema (2666), tema na UI (2770) | 8 | sim |
| 5 | `m4-ordem-servico` | Shell D4, conteúdo, painel de detalhe (2669, 2670, 2671) | 11 | sim |
| 6 | `m6-menu-conta` | Menu da conta, Meus dados, Histórico, Sair, preview (2881 E2E, exceto 01 e 09) | 11 | sim |
| 7 | `historico-bff-stub` | BFF contra o stub do MS (2866) | 17 | opt-in `RELEASE_HISTORICO_STUB=1` |
| 8 | `historico-api-stub` | Preview, histórico e Meus dados contra o stub (2881 API) | 27 | opt-in `RELEASE_HISTORICO_STUB=1` |
| 9 | `homolog-api-2881` | Mesmo arquivo da fase 8, em modo homolog (MS real) | 27 | opt-in `RELEASE_HOMOLOG=1` |
| 10 | `homolog-talk-aparencia` | Talk › Portal do Cliente: aparência, favicon, logo (último: altera dados) | 5 | opt-in `RELEASE_HOMOLOG=1` |
| 11 | `sql-2876` | Contrato SQL de `portal_cliente_config` (`DROP DATABASE` local) | 7 | opt-in `RELEASE_SQL_LOCAL=1` |

Padrão = 59 testes. Total de testes distintos da suíte = 115 (as fases 8 e 9 são o mesmo arquivo em dois modos — não ligue as duas na mesma bateria). Duração estimada: a medir na primeira execução completa.

### Como ligar os opt-ins

```powershell
$env:RELEASE_HISTORICO_STUB = "1"; npm run test:release     # ou: npm run test:release -- --incluir=historico-bff-stub,historico-api-stub
$env:RELEASE_HOMOLOG = "1";        npm run test:release
$env:RELEASE_SQL_LOCAL = "1";      npm run test:release
```

bash: `RELEASE_HOMOLOG=1 npm run test:release`. Os opt-ins precisam ser variáveis do **ambiente do terminal** (valor `1`); não basta colocá-las no `.env.local`.

### O que fica fora do padrão e por quê

- **Histórico com stub** e **homolog**: exigem uma stack diferente na porta `3333` (portalcliente-api real em vez do mock-bff) — não convivem com a lane mock.
- **Homolog**: altera dados reais da empresa (favicon, logo, histórico, links). Por isso `--workers=1` e a aparência do Talk por último.
- **SQL 2876**: recria banco no Postgres local.

Rode as lanes opt-in **depois** da lane mock, trocando o servidor da `3333` entre elas.

### Como saber se passou

- Saída `✓ APROVADO` e código de saída `0` = release aprovada. `✗ REPROVADO` = código `1`. Pré-voo ou configuração inválida = código `2`.
- O relatório fica em `release-report/<AAAAMMDD-HHmmss>/` (`resumo.md`, `resumo.json` e um `<fase>.log` por fase).
- Cada fase também para sozinha na primeira falha (`PW_MAX_FAILURES=1`).
- Para retomar: `npm run test:release -- --de=<fase-que-falhou>`.

### Checklist antes de rodar

- [ ] Branch `develop` atualizada (`git pull`) e árvore limpa.
- [ ] `npm install` feito; `.env.local` criado.
- [ ] portalcliente-web (`3000`) e mock-bff (`3333`) no ar — o pré-voo confere e reprova se estiverem fora.
- [ ] Nenhum `.only` esquecido (o pré-voo também confere).
- [ ] Para lanes opt-in: stack correta da `3333`, stub no ar, massa de homolog no `.env.local`, Postgres local.
- [ ] **Decisão do Boleto resolvida** (veja seção 12) — enquanto não for, uma das fases `smoke` / `m4-ordem-servico` / `m6-menu-conta` reprova.

## 9. Fluxo de branches e versões

```
main      ← só recebe código quando uma versão é liberada (PR develop → main)
develop   ← integração: toda branch de teste abre PR para cá
test/<TICKET>-<slug> · feat/… · fix/… · chore/…   ← criadas a partir da develop
```

Dia a dia:

1. `git switch develop` e `git pull`
2. `git switch -c test/TALK-1234-descricao-curta`
3. Commits pequenos → `git push -u origin <branch>` → abrir PR **com base na develop** (não na main)
4. Revisão + testes do módulo verdes → merge na develop

Liberação de versão:

1. develop atualizada e estável
2. Rodar `npm run test:release` a partir da develop, no ambiente alvo → precisa sair **APROVADO**
3. Abrir PR **develop → main** colando o `release-report/<data>/resumo.md`
4. Merge na main (opcional: tag `vAAAA.MM.DD`)

Hotfix: branch `hotfix/<TICKET>` a partir da main → PR para a main → depois levar a main para a develop (PR main → develop).

## 10. Como criar um teste novo

1. **Escolha a pasta** pelo tipo: `tests/api/<módulo>/`, `tests/smoke/<módulo>/` ou `tests/e2e/specs/<módulo>/`. O módulo hoje é nomeado `modulo-talk-NNNN[-slug]` (NNNN = ticket Dev).
2. **Nome do arquivo**: `kebab-case.spec.ts` (ou `CT-API-…`/`CT-E2E-…` quando o arquivo agrupa um tema). O Playwright só enxerga `*.spec.ts` dentro de `api/`, `smoke/` e `e2e/specs/` (veja `testMatch` no config).
3. **Título do teste**: `CT-XXX-NN — descrição` (ex.: `CT-E2E-04 — …`). O ID no começo é lido por `extrairCtIdDoTitulo` e vira o nome da evidência do pre-CR.
4. **Importe o `test` certo**: em E2E/smoke use `import {expect, test} from '../../fixtures'` (ou `../../e2e/fixtures` no smoke); em API use `@playwright/test`.
5. **Page Object**: telas e menus ficam em `tests/e2e/pages/`. O spec só orquestra; localizadores novos vão para o PO.
6. **Seletores**, nesta ordem: `data-testid` → `aria-label` → `role`. Nunca classes CSS. Se falta `data-testid`, abra PR no `portalcliente-web` **apenas** com o atributo.
7. **Dados**: tokens e celulares do mock em `tests/e2e/helpers/portalFixtures.ts`; massa de homolog em `helpers/portal/massaPortal2881.ts`. Para "sem massa", use `pularSeNaoAplicavel(condição, motivo)` (vira skip, não falha).
8. **Rede**: para isolar do BFF use `page.route(...)` nos helpers de `helpers/portal/` (ex.: `mockarDetalheOsCliente`).
9. **Registro**: some o arquivo no `scripts/pre-cr/catalogo-modulos.json` (`npm run pre-cr:bootstrap` cria a entrada) e, se quiser atalho, um script `test:modulo-talk-NNNN` no `package.json`. **Para a bateria de release**, confira em qual fase do `release.config.mjs` o novo arquivo cai (pastas novas precisam ser adicionadas a uma fase).
10. Valide: `npx playwright test <arquivo> --project=chromium --list` e depois sem `--list`.

Exemplo mínimo, adaptado de `tests/smoke/modulo-talk-2638/CT-SMK-landing.spec.ts`:

```ts
import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';

test.describe('Smoke — landing portal (TALK-XXXX)', () => {
   test('CT-SMK-01 — Tela de acesso com marca', async ({page}) => {
      await page.goto(`/${C_TOKEN_OK}`);
      await expect(page.getByTestId('acesso-cabecalho-marca')).toBeVisible();
      await expect(page.getByRole('button', {name: 'Acessar'})).toBeVisible();
   });
});
```

Convenções de código do repo: indentação de 3 espaços, aspas simples, prefixos húngaros (`c` string, `n` número, `l` booleano, `o` objeto, `m` lista, `C_` constante).

## 11. Regras de ouro

**Sempre**

- Um teste não depende de outro: crie e limpe a própria massa.
- Espere por condição (`expect(...).toBeVisible()`, `expect.poll`), nunca por tempo.
- Rode o módulo localmente antes de abrir PR.
- Restaure dados de homolog que você alterou (`restaurar()` nos helpers de massa).

**Nunca**

- `page.waitForTimeout` (hoje não há nenhum no repo; mantenha assim).
- Deixar `test.only` / `describe.only` — o pré-voo da bateria reprova.
- Usar dados de produção ou executar homolog sem avisar o time.
- Commitar `.env`, `.env.local`, `playwright-report/`, `test-results/`, `release-report/`.
- Alterar `portalcliente-web`/`portalcliente-api` para "fazer o teste passar": QA só adiciona `data-testid`.
- Rodar o spec SQL 2876 num Postgres que não seja o local de testes.

## 12. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot find package '@axe-core/playwright'` (ou `pg`) | `node_modules` incompleto | `npm install` (ou `npm ci`) na raiz |
| `ECONNREFUSED 127.0.0.1:3333` / pré-voo "Serviço fora do ar" | mock-bff (ou API real) não subiu | Subir o servidor da `3333` (seção 7) |
| `ECONNREFUSED` na `3000` | portalcliente-web fora do ar | `npm run dev` no web com `NEXT_PUBLIC_API_URL` correto |
| `ECONNREFUSED 127.0.0.1:18881` nos specs 2866/2881 API | stub do histórico fora do ar | `node scripts/qa/stub-ms-portal-historico.mjs` |
| Testes do histórico/2881 API falham com `404`/token desconhecido na lane stub | a `3333` está com o mock-bff em vez do portalcliente-api real | Trocar o servidor da `3333` (seção 8) |
| Chrome não abre / "Executable doesn't exist" | Chrome não instalado | `npx playwright install chrome`, ou `E2E_USE_CHROMIUM=1` |
| Execução para após o 1º erro | `maxFailures: 1` (stop-on-fail) | `PW_MAX_FAILURES=0` para ver todos |
| `TALK_EMAIL precisa estar no .env.local` | specs de Talk/homolog sem credenciais | Preencher `TALK_EMAIL`/`TALK_PASSWORD` ou não rodar a lane homolog |
| `massa: defina PORTAL_OS_HISTORICO_HOMOLOG…` | massa de homolog incompleta | Preencher as variáveis `PORTAL_*_HOMOLOG` |
| Spec SQL falha ao conectar | Postgres local fora do ar / sem superusuário | Conferir `PORTAL_SQL_ADMIN_URL` |
| Pré-voo: `.only esquecido` | `test.only` no código | Remover |
| `--de=…` "fase desconhecida" | id errado | `npm run test:release:listar` |

**Problemas conhecidos (decisão do time pendente)**

- **Boleto — asserção contraditória.** `tests/smoke/modulo-talk-2638/CT-SMK-autenticado.spec.ts:66` e o `irParaBoleto()` do `shell-d4-portal.spec.ts:26` esperam o menu Boleto **visível**; `CT-E2E-portal-favicon-historico-menu.spec.ts:97` espera **0** ocorrências. Não dá para os dois passarem. É bug do produto ou teste desatualizado? Decidir com o time antes de liberar.
- **Corrida em homolog.** O CT-API do 2881 (PATCH de favicon/histórico na empresa `0001`) e o `CT-E2E-talk-aparencia-imagens` (upload de favicon/logo na mesma empresa) mexem nos mesmos dados; por isso a lane homolog usa `--workers=1` e a aparência do Talk vai por último.
- **Branches ainda fora da develop**: `test/IN-911-mascara-telefone` e `test/URG-10463-portal-link-409-ctoken` (veja `docs/melhorias-estrutura.md`).

## 13. Documentos relacionados

- [README.md](README.md) — visão geral e comandos do pre-CR.
- [docs/melhorias-estrutura.md](docs/melhorias-estrutura.md) — análise e plano de melhorias da suíte.
- [tests/e2e/specs/README.md](tests/e2e/specs/README.md) e [tests/e2e/pages/README.md](tests/e2e/pages/README.md) — notas de pasta (ainda dizem "vazio no esqueleto").
- [evidencias-pr/README.md](evidencias-pr/README.md) — layout das evidências do pre-CR.
- [docs/tests/README.md](docs/tests/README.md) — artefatos locais da rodada.
- `scripts/release/run-release.mjs` — cabeçalho com todas as opções da bateria.
