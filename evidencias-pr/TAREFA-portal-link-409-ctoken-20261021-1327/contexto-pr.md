# Contexto da PR — portal-link-409-ctoken

- **Produto:** portal (projectKey Jira `URG`)
- **Plataforma:** web / API (microserviço HTTP; sem tela nova)
- **Tarefa:** URG-10463 (Bug) · Dev URG-10710 · Teste URG-10835
- **PR:** https://github.com/CERTTUS/api-microservicos/pull/22 (`urgente/URG-10463`, base `d9b0224`)
- **Commits:** `ef53665` (fix) e `89d93d2` (teste de integração da corrida)
- **Repo produto:** `api-microservicos` · **Repo testes:** `testes-automatizados-Portal`

## Resumo

O link do Portal do Cliente não chegava ao cliente: na corrida de emissão, `POST /servicos/portal/link` respondia 409 sem token e o api-mobile não tinha o que enviar por WhatsApp. Agora o 409 de conflito com link ativo devolve `oDados.cToken` (`lHashAtualizado: false`). Sem link ativo, o 409 segue sem `oDados`. O 200 não muda (mudança aditiva no contrato).

## Arquivos e módulos

| Arquivo | Mudança |
|---------|---------|
| `src/services/OsLinkPublicoRepositorio.ts` | `OsLinkPublicoConflitoErro` ganha `cTokenAtivo?` (2º argumento do construtor) |
| `src/services/PortalClienteLinkServico.ts` (`linkEmitir`) | No catch do insert: se há link ativo de outro telefone, lança `OsLinkPublicoConflitoErro(msg, oConflito.token)` |
| `src/controllers/Servico/PortalLinkEmitirController.ts` | 409 com `oDados: { cToken, lHashAtualizado: false }` quando o erro traz `cTokenAtivo` |
| `.../__tests__/PortalLinkEmitirController.test.ts` (novo) | Jest do controller |
| `.../__tests__/PortalLinkEmitir.corrida.integracao.test.ts` (novo) | Corrida com controller, serviço e repositório reais; tabela `os_link_publico` em memória com os UNIQUE do Supabase (erro 23505) |
| `src/services/__tests__/PortalClienteLinkServico.test.ts` | Ajuste de 5 linhas |

## Fluxo principal (`linkEmitir`)

1. Valida celular (422 se ausente) e calcula o hash do telefone.
2. `findAtivoPorOs`:
   - Link ativo com hash diferente: `atualizarHash` e retorna 200 com `lHashAtualizado: true`.
   - Link ativo com o mesmo hash: retorna 200 com o token existente e `lHashAtualizado: false`.
3. Sem link ativo: gera token e faz `insert`.
4. Insert viola UNIQUE (corrida) e vira `OsLinkPublicoConflitoErro`. Relê o link ativo:
   - Mesmo telefone: 200 com o mesmo token.
   - Telefone diferente: **novo** — 409 com `oDados.cToken` do link ativo e `lHashAtualizado: false`.
   - Nenhum link ativo (conflito de token): 409 sem `oDados`, como antes.

## Regras de negócio

- Um link ativo por OS (UNIQUE por OS e por token).
- Mesmo telefone reaproveita o token; telefone diferente em emissão sequencial atualiza o hash.
- No 409 da corrida o hash **não** é atualizado, e o token pertence a link registrado com **outro** telefone.
- O portal pede o telefone ao abrir o link. Quem acessa com celular diferente recebe "Acesso negado" (CT-3 do roteiro).

## Roteiro do Dev (customfield_10894)

- CT-1: recebe link por WhatsApp (depende do api-mobile e WhatsApp real).
- CT-2: gravação repetida/corrida (409 com cToken).
- CT-3: celular diferente leva a "Acesso negado" (portal web).
- Decisões do humano em `harness-handoff.json`: review pré-CR ok; CT-1 e CT-3 **manuais**; CT-2 coberto por API (409 com cToken).

## Pontos de atenção para testes

- Rota: `POST /servicos/portal/link`. Asserções do 409: `lSucesso: false`, `cMensagem` e `oDados.cToken` (string não vazia) com `lHashAtualizado: false`.
- Casos negativos e bordas:
  - 409 sem link ativo: `oDados` ausente.
  - Mesmo telefone em paralelo: 200/200 com o mesmo token.
  - Telefones diferentes em sequência: 200 com `lHashAtualizado: true`.
  - 422 sem celular.
- Reproduzir a corrida determinística de ponta a ponta exige simular o UNIQUE (Jest em memória) ou paralelismo real contra o banco `portaldocliente` (Postgres local do handoff). Na base `d9b0224` o caso principal falha (409 sem `oDados`).
- Consumidor api-mobile: não deve enviar esse token a telefone novo. Fora do escopo do microserviço.
- Regra `qa-automacao-sem-humano`: CT-1 (WhatsApp real) e CT-3 (telefone diferente com Acesso negado no portal, que exige massa e dispositivo) entram em `## Manual`, conforme decisão do humano. Automatizar só o que o runner chega a PASS sozinho, como API HTTP e o 409 com cToken.
- Mudança sem UI nova: não há `data-testid` novo para instrumentar.
- A PR traz `<IgnoraReview>` no título e prevê conflito de merge com as branches TALK-* (reindentação do mesmo `catch`).
- Credenciais e banco de teste: ver `harness-handoff.json` (`loginTeste`, `bancoTeste`).
