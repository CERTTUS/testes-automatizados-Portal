# Review pré-CR — portal-link-409-ctoken

> Teste: URG-10835 | HU: URG-10463 (Bug) | Dev irmã: URG-10710
> `modoPipeline: completo` · WU TESTES

## Decisão do humano (gate `review_pre_cr`)

Resposta: **ok**. Registrado e não reapresentado.
- CT-1 (WhatsApp) e CT-3 (celular diferente, Acesso negado) ficam em `## Manual` / ASSISTIDO.
- 409 com cToken (CT-2) coberto por API.

## Pacote encontrado

| Item | Valor |
|------|--------|
| PR produto | https://github.com/CERTTUS/api-microservicos/pull/22 (`urgente/URG-10463`) |
| PR testes | ausente (os testes estão na própria PR do produto) |
| Zip pré-CR | ausente |
| Specs API/Smoke no diff | nenhum |
| Jest (repo produto) | `src/controllers/Servico/__tests__/PortalLinkEmitirController.test.ts` (novo, 5 testes); `src/controllers/Servico/__tests__/PortalLinkEmitir.corrida.integracao.test.ts` (novo, 3 testes); `src/services/__tests__/PortalClienteLinkServico.test.ts` (ajuste de 5 linhas, 20 testes) |

Execução informada pelo humano: 11 suites de `src`, 60 testes passando. As 4 "falhas" são `dist/*.d.ts` sem teste (ruído de config, não regressão).

## Resumo (máx. 8 linhas para o chat)

- O diff do produto (6 arquivos) é coberto por Jest em três níveis: controller, serviço e corrida de integração.
- A corrida usa controller, serviço e repositório reais, com tabela em memória e os UNIQUE do Supabase (23505).
- Não há specs API/Smoke HTTP no repo de testes; a cobertura de HTTP real fica como lacuna do E2E.
- Sem skip, sem pause e sem E2E vazado no pacote.
- CT-1 e CT-3 são manuais por decisão do humano e pela regra `qa-automacao-sem-humano`.
- **Conclusão:** `ok-para-e2e`

---

## Matriz diff produto × CT pré-CR

| Alteração (arquivo / endpoint / tela) | CT-API / CT-SMK / Jest | Escopo | Qualidade |
|---------------------------------------|------------------------|--------|-----------|
| `OsLinkPublicoRepositorio.ts` (`cTokenAtivo?` no erro) | Jest do serviço e da corrida | no-escopo | ok |
| `PortalClienteLinkServico.linkEmitir` (catch do insert lança erro com token ativo) | `PortalClienteLinkServico.test.ts`; corrida | no-escopo | ok |
| `PortalLinkEmitirController.ts` (409 com `oDados.cToken`, `lHashAtualizado:false`) | `PortalLinkEmitirController.test.ts`; corrida | no-escopo | ok |
| `POST /servicos/portal/link` ponta a ponta HTTP | nenhum (só Jest em memória) | parcial | lacuna E2E/API |

---

## Órfãos (fora da tarefa)

- (nenhum)

---

## Ajustar (antes do E2E)

- (nada)

---

## Mais API/Smoke (ainda neste hop)

- Nenhum item obrigatório. A API HTTP real entra como lacuna da WU Teste (abaixo).

---

## Lacunas E2E

1. **CT-2 (corrida via API HTTP)**: disparar `POST /servicos/portal/link` com telefones diferentes em paralelo contra a API e o banco `portaldocliente`. Esperado: um 200 e um 409 com `oDados.cToken` do link ativo e `lHashAtualizado:false`. Entra como CT-API automatizado (HTTP, sem humano).
2. **CT-2 bordas via API**: mesmo telefone em paralelo (200/200 com o mesmo token); 400 sem celular (confirmado pelo humano; antes 422 por engano); telefones diferentes em sequência (200 com `lHashAtualizado:true`).
3. **CT-1 (receber link por WhatsApp)**: Manual / ASSISTIDO. Depende do api-mobile e de WhatsApp real. Não gerar spec.
4. **CT-3 (celular diferente leva a Acesso negado no portal)**: Manual / ASSISTIDO. Exige massa e dispositivo. Não gerar spec.

---

## Alertas

- E2E/WDIO de jornada no diff do pré-CR: não
- Skip por massa/env: não
- Área sensível sem par feliz+negativo: não (409 com e sem link ativo, 422 e mesmo telefone cobertos no Jest)
- A PR traz `<IgnoraReview>` no título e prevê conflito de merge com as branches TALK-* (mesmo `catch`). Não afeta os testes.
