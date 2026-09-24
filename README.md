# CERTTUS Portal do Cliente — Testes Automatizados

Suíte **Playwright + TypeScript** do Portal do Cliente. Base para o hop Dev (`QA_PRE_CR`): o primeiro spec de produto nasce na primeira tarefa (bootstrap do catálogo).

Repositórios de produto: `portalcliente-web` / `portalcliente-api`.

## O que já existe

| Peça | Função |
|------|--------|
| `scripts/pre-cr/` | Resolver slug, bootstrap, executar pontual, empacotar zip, corpo da PR |
| `tests/e2e/helpers/pre-cr/` | Screenshot e vídeo no PASS quando `PRE_CR=1` |
| `qa-pre-cr.json` | Manifesto lido por `qa-test-dev.py` no Harness |
| Catálogo | `scripts/pre-cr/catalogo-modulos.json` — vazio até a 1ª Dev |

**Não** rode a suíte inteira no hop Dev. MeloQA fica na WU Teste.

## Instalação

```bash
npm install
npx playwright install chromium
npx playwright install chrome
copy .env.example .env.local
```

Suba o `portalcliente-web` (porta padrão `3000`) e o `portalcliente-api` (porta padrão `3333`). Ajuste `.env.local` se necessário.

## Workspace recomendado

Abra juntos no Cursor:

- `Portal do Cliente/portalcliente-web`
- `Portal do Cliente/portalcliente-api`
- `testes-automatizados-Portal` (este repo)

Defina `HARNESS_HOME` apontando para o clone do repo `CERTTUS/Cursor`.

## Comandos

| Script | Uso |
|--------|-----|
| `npm run pre-cr:modulos` | Lista módulos (vazio até o bootstrap) |
| `npm run test:pre-cr -- --modulo <slug> --dev-key <DEV> --parent-key <HU>` | Hop Dev |
| `npm run test:dev -- --dev-key <DEV> --parent-key <HU> --repo ../portalcliente-web` | Ciclo completo via Harness |
| `npm run pre-cr:bootstrap -- --from-diff --parent-key <HU> --dev-key <DEV>` | Cria slug quando o diff não casa |
| `npm run test:e2e` | E2E (quando houver specs) |

## Estrutura

```text
tests/e2e/specs/     # specs por área (criados no hop Dev)
tests/e2e/pages/     # Page Objects
tests/e2e/helpers/pre-cr/
scripts/pre-cr/
docs/tests/          # local (gitignored), exceto README
evidencias-pr/       # local (gitignored)
```

Seletores: `data-testid` → `aria-label` → `role`. No `portalcliente-web`, QA só adiciona `data-testid`.

## Rules QA (Harness)

Após clone ou pull do Harness:

```bat
py -3 "%HARNESS_HOME%\scripts\harness\sync_qa_rules.py" --profile test-repo --repo "%CD%"
```
