# Escopo — portal-link-409-ctoken

> Teste: URG-10835 | HU: URG-10463 (Bug) | Dev irmã: URG-10710
> PR: https://github.com/CERTTUS/api-microservicos/pull/22 · `modoPipeline: completo` · WU TESTES
> Status: **proposta** (aguardando gate `escopo`)

## Plataforma

`web` (handoff). Na prática o alvo é **API HTTP** do microserviço (`POST /servicos/portal/link`), sem tela nova e sem `data-testid` novo. Sem emulador/simulador.

## Risco

**médio**

- Mudança pequena e localizada: 3 arquivos de produção (`OsLinkPublicoRepositorio.ts`, `PortalClienteLinkServico.ts`, `PortalLinkEmitirController.ts`), todos do mesmo domínio (link do Portal do Cliente).
- Contrato da API muda de forma **aditiva**: o 409 passa a devolver `oDados.cToken` e `lHashAtualizado:false`. O 200 não muda.
- Eleva o risco acima de baixo: o token devolvido no 409 pertence a um link registrado com **outro** telefone. Um consumidor que o envie a um telefone novo exporia acesso, e o portal só protege isso pedindo o celular ao abrir o link. É um ponto de segurança/permissão, não só de UI.
- Não há auth, pagamento, migração nem shared/core no diff, então não chega a `alto`.

## Nível sugerido

`regressao-dominio`

## Justificativa

- O fluxo `linkEmitir` tem vários ramos que dividem o mesmo `catch` do insert (mesmo telefone, telefone diferente em sequência, corrida, conflito sem link ativo, 422). Testar só o caminho novo deixa os vizinhos sem proteção contra regressão.
- `smoke-modulo` não basta: o defeito só aparece na corrida (UNIQUE do banco), que exige exercitar o endpoint contra o banco `portaldocliente`.
- `full` seria exagero: sem auth, shared/core, migração ou vários módulos; a PR traz só 3 arquivos de produção no mesmo domínio.
- O pré-CR (`review-pre-cr.md`, conclusão `ok-para-e2e`) cobre controller, serviço e corrida com Jest em memória, mas deixa como lacuna o HTTP real. Este escopo fecha essa lacuna.

## Incluir na execução

Todos automatizados (API HTTP e E2E Playwright), sem humano (`qa-automacao-sem-humano`):

| Item | Descrição | Esperado |
|------|-----------|----------|
| CT-2 (principal) | Corrida: `POST /servicos/portal/link` com telefones diferentes em paralelo, mesma OS | Um 200 e um 409 com `lSucesso:false`, `cMensagem`, `oDados.cToken` (string não vazia) e `lHashAtualizado:false` |
| CT-2 borda A | Mesmo telefone em paralelo | 200/200 com o mesmo token |
| CT-2 borda B | Telefones diferentes em sequência | 200 com `lHashAtualizado:true` (hash atualizado, sem 409) |
| CT-2 borda C | Emissão sem celular | 400 (confirmado pelo humano; Joi do controller) |
| CT-2 borda D | 409 sem link ativo (conflito de token) | 409 **sem** `oDados` (se o banco permitir reproduzir; senão fica coberto só pelo Jest) |
| CT-3 → CT-E2E-01 (E2E Playwright) | Link emitido via API (tel. A), abrir `/{token}` e informar tel. B diferente; fase positiva com tel. A | "Acesso não autorizado" (403), URL permanece em `/{token}`, sem dados da OS; tel. A redireciona a `/os/{token}` |
| Regressão do domínio | 200 com mesmo telefone e mesmo hash (token existente, `lHashAtualizado:false`) | 200 sem alteração de contrato |

Módulos impactados: Portal do Cliente — emissão de link (`linkEmitir`), repositório `os_link_publico`, controller `PortalLinkEmitirController`.

## Fora de escopo

| Item | Motivo |
|------|--------|
| CT-1 — receber link por WhatsApp | Manual / ASSISTIDO. Depende do api-mobile e de WhatsApp real. Decisão do humano (`review_pre_cr`) e regra `qa-automacao-sem-humano`. Sem spec. |
| Consumidor api-mobile (envio do token por WhatsApp) | Fora do microserviço; a PR não o altera. |
| Reexecução dos Jest da PR (controller, serviço, corrida em memória) | Já executados no pré-CR (11 suites, 60 testes passando); não entram na suíte E2E/API deste hop. |
| Demais jornadas do portal web | Só a jornada "celular diferente" (CT-E2E-01) entra; sem `data-testid` novo. |
| Conflito de merge com branches TALK-* e `<IgnoraReview>` no título | Questão de integração/processo, não afeta os testes. |
| Suíte ampla (`full`) | Sem sinais de risco alto no diff. |

## Orientação para executor

- Repo de testes: `C:\Users\erick.felipe\Documents\GitHub CERTTUS\testes-automatizados-Portal`. Repo do produto: `C:\Users\erick.felipe\Documents\GitHub CERTTUS\api-microservicos`.
- Alvo: `POST /servicos/portal/link` com a API do microserviço no ar apontando para o Postgres `portaldocliente` (ver `bancoTeste` e `loginTeste` em `harness-handoff.json`; não repetir credenciais em outros artefatos).
- Corrida: disparar as duas requisições em paralelo (`Promise.all`) contra a mesma OS (a do próprio spec), sem link ativo prévio, e limpar o link da OS antes e depois de cada CT para não depender de ordem.
- Asserções do 409: `lSucesso:false`, `cMensagem` presente, `oDados.cToken` string não vazia, `oDados.lHashAtualizado:false`. Na base `d9b0224` o caso principal falha (409 sem `oDados`), o que serve como prova de que o teste detecta o bug.
- **Massa (revisada 2026-10-21):** cada arquivo de spec CRIA a própria OS no `beforeAll` via api-mobile (banco local `portaldocliente`; exige `TOUCH_API_OS_GRAVAR=1`, só localhost, nunca produção) e usa somente ela; o teste nunca mexe em OS que não criou. As guardas validam "OS criada pelo próprio teste" (registro em `.portal-state/os-criadas/<runId>/`). No `afterAll`: revogar o link; a OS **não** é cancelada (sem forma segura; pendência do humano). Supabase de produção: só links dessas OS + telefones fictícios, com `PORTAL_ALLOW_PROD_WRITE=1`. Detalhes em `massa-local.md`.
- Specs independentes (cada um com sua OS): rodam em paralelo, sem `--workers=1`.
- Banco: usar Postgres local do handoff. Se a corrida real for não determinística, repetir N tentativas e exigir ao menos um 409 com token; nunca `pause` nem `skip` para fechar verde.
- Tag/grep sugeridos: `CT-API` (módulo `portal-link-409-ctoken`). Rodar o spec isolado, sem `test:all`.
- Pré-voo antes da suíte: API e banco acessíveis, `.env` de testes com login. Ciclo MeloQA só no gate `meloqa_ciclo`, imediatamente antes da suíte.

---

## Gate `escopo` (para o humano)

**Pergunta (texto exato):**

> Escopo sugerido para a rodada de testes de URG-10835 (portal-link-409-ctoken): nível `regressao-dominio`, risco médio, plataforma web/API. Entram 5 CTs de API HTTP automatizados (CT-2: corrida com telefones diferentes, mesmo telefone em paralelo, telefones diferentes em sequência, 400 sem celular, 409 sem link ativo) mais a regressão do 200 com mesmo telefone. CT-1 (WhatsApp) e CT-3 (Acesso negado) ficam fora da suíte automatizada, como manuais assistidos. Como deseja seguir?

**Opções:**

| id | Rótulo | Efeito |
|----|--------|--------|
| `aprovar` | Aprovar o escopo sugerido (`regressao-dominio`) | Segue para inventário MeloQA e geração de cenários com este escopo |
| `smoke-modulo` | Reduzir para `smoke-modulo` | Só a corrida principal (CT-2 telefones diferentes) e o caminho feliz; bordas viram opcionais |
| `full` | Ampliar para `full` | Inclui suíte ampla do Portal além do domínio de link |
| `ajustar` | Ajustar itens (comentar o que incluir ou remover) | O seletor reescreve `escopo.md` e o gate é reapresentado |
