# Resumo da bateria - portal-link-409-ctoken

<!-- HARNESS_RESUMO_BATERIA_INICIO -->

Bateria de testes - Aprovado com ressalva (2026-10-21)

- Veredito: Aprovado (ressalva: CT-MAN-01 nao aplicavel nesta rodada)
- Ciclo MeloQA: `1d1230b2-c9bc-45f6-9e8b-f7d9341503fb` (Em progresso; mantido aberto por decisao do humano)
- URL ciclo: https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-cycle/8c434a0b-789b-47ee-bf5d-df4abb0e3f2c?type=small&id=1d1230b2-c9bc-45f6-9e8b-f7d9341503fb
- Contagem: 9/9 CTs automatizados executados · 9 Passou · 0 Falhou · 0 Skip (11 testes no projeto, incluindo setup e teardown; execucao final 11 passed em 14,3 s)
- CT-API-01 - Passou (corrida com telefones diferentes: 200 + 409 com oDados.cToken)
- CT-API-02 - Passou
- CT-API-03 - Passou
- CT-API-04 - Passou (400 sem celular)
- CT-API-05 - Passou (422 telefone invalido)
- CT-API-06 - Nao rodou no E2E (so Jest; Jest do Dev 60/60)
- CT-API-07 - Passou
- CT-API-08 - Passou (401 sem chaveapi)
- CT-API-09 - Passou
- CT-E2E-01 (ex CT-MAN-02, Acesso negado) - Passou
- CT-MAN-01 (WhatsApp) - Nao aplica nesta rodada / ressalva: so pode ser validado quando a URG-10711 (api-mobile) for concluida
- Bug do Teste: nao
- Bug avulso de produto: nao

<!-- HARNESS_RESUMO_BATERIA_FIM -->

## Identificacao

| Campo | Valor |
|-------|-------|
| Issue Teste | URG-10835 |
| Bug pai | URG-10463 (Dev URG-10710, PR #22 CERTTUS/api-microservicos) |
| Produto / plataforma | `portal` `web` (API HTTP + E2E) |
| Ambiente | local (API :8085, api-mobile :8086, BFF :3333, web :3000) com Supabase de PRODUCAO |
| Data | 2026-10-21 |
| Comando da bateria | `npm run test:portal-link-409` (testes-automatizados-Portal) |

## Ressalvas

- Supabase de PRODUCAO (projeto fhyqbokzmolqtxwufklk) usado por autorizacao explicita do humano, so em links das OS criadas pelo teste, com opt-in PORTAL_ALLOW_PROD_WRITE=1. 0 links ativos ao final.
- WhatsApps reais enviados ao celular do QA (mascarado 46991****) ao criar as OS pela api-mobile (ate 4 mensagens: 2 na tentativa 1 e 2 na tentativa 2).
- 4 OS QA-AUTO URG10463 (026846 a 026849) ficaram abertas em Recepcao; sem cancelamento automatico (decisao do humano).
- Deteccao do bug na base d9b0224 nao provada (opcional).
- Inspecao MCP e pre-voo ocorreram depois do codigo do spec E2E (desvio aceito pelo humano); a tela /os/{token} nao foi reinspecionada via MCP.
- A 1a execucao de API falhou por AMBIENTE (API no banco errado) e a 1a reexecucao falhou por TESTE (HTTP 201 do api-mobile); ambas corrigidas, nenhuma por produto.
- Pendencias do humano: Supabase dev/homolog; rotacionar SUPABASE_SERVICE_ROLE_KEY e MELOQA_API_TOKEN (expostos no chat); decidir sobre as 4 OS abertas; commit do codigo novo no repo de testes.

## Veredito

| Campo | Valor |
|-------|-------|
| Veredito da bateria | Aprovado (com ressalva) |
| Status sugerido da issue Teste | Concluido - Aprovado |
| Ciclo MeloQA | Em progresso (mantido aberto) |

## Ciclo MeloQA

| Campo | Valor |
|-------|-------|
| cycleId | 1d1230b2-c9bc-45f6-9e8b-f7d9341503fb |
| cycleName | URG-10463 - Ciclo 1 - Link Portal 409 cToken |
| cycleUrl | ver bloco acima |

## Bug do Teste vs Bug avulso

| Campo | Valor |
|-------|-------|
| Ha Bug do Teste? | nao |
| Bug avulso de produto | nao |
| Motivo versionado | - |

## Evidencias

- `docs/tests/URG-10463/portal-link-409-ctoken/resultado-execucao.md`
- `docs/tests/URG-10463/portal-link-409-ctoken/meloqa-sync.md`
