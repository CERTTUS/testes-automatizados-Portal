---
vereditoSugerido: APROVADO
cycleId: 1d1230b2-c9bc-45f6-9e8b-f7d9341503fb
---
# Resultado da execucao - URG-10835 (PR #22, URG-10710)

Ambiente: API local :8085 na branch urgente/URG-10463; banco local portaldocliente; **a corrida rodou contra o Supabase de PRODUCAO (fhyqbokzmolqtxwufklk) por autorizacao explicita do humano**, restrita as OS de teste 026794-026799 (empresa 0001/BOMBAS), telefones ficticios. Comando: `npx playwright test tests/e2e/specs/portal-link-409-ctoken/api.spec.ts --project=chromium`.

## Historico
- Tentativa 1: CT-API-01 falhou (500/500, `relation "pcmtemp0" does not exist`). Classificacao: AMBIENTE/TESTE (API apontava para BANCO_DADOS_URL=sistemacerttus), nao produto. Ajustado para portaldocliente conforme informado pelo humano.
- Tentativa 2: 8 passed (10,2 s).

## resultadosPorCT
| CT | status | evidencia |
|----|--------|-----------|
| CT-API-01 corrida tel. diferentes -> 200 + 409 com oDados.cToken | PASSOU | Playwright |
| CT-API-02 mesmo telefone paralelo 200/200 | PASSOU | Playwright |
| CT-API-03 tel. diferentes em sequencia, hash atualizado | PASSOU | Playwright |
| CT-API-04 sem celular -> 400 | PASSOU | Playwright |
| CT-API-05 telefone invalido -> 422 | PASSOU | Playwright |
| CT-API-06 409 sem link ativo | NAO_EXECUTADO (so Jest; Jest do Dev passou 60/60) | Jest |
| CT-API-07 reemissao mesmo telefone reaproveita token | PASSOU | Playwright |
| CT-API-08 sem chaveapi -> 401 | PASSOU | Playwright |
| CT-API-09 perdedor nao altera telefone | PASSOU | Playwright |
| CT-MAN-01 WhatsApp (CT-1 do Dev) | NAO_EXECUTADO (manual/ASSISTIDO, depende de URG-10711 api-mobile) | - |
| CT-MAN-02 Acesso negado (CT-3 do Dev) | NAO_EXECUTADO (manual/ASSISTIDO) | - |

mudancasSolicitadas: []
Observacao: nao foi provada a deteccao na base d9b0224 (opcional). CT-MAN-01/02 pendentes de execucao humana.

## meloqa_resultado
- Decisao do humano: manter_aberto. Ciclo 1d1230b2-c9bc-45f6-9e8b-f7d9341503fb permanece Em progresso; nenhuma execucao marcada no MeloQA. cicloMeloqaManterAberto: true.

## Rodada E2E - CT-E2E-01 (ex CT-MAN-02), mesmo ciclo 1d1230b2 (nao fechado, execucoes nao marcadas)
- Comando: `npx playwright test tests/e2e/specs/portal-link-409-ctoken/acesso-negado.e2e.spec.ts --project=chromium --workers=1`
- Resultado: 1 passed (14,7 s). CT-E2E-01 PASSOU: celular diferente -> 'Acesso nao autorizado' (403), URL permanece em /{token}; fase positiva redireciona para /os/{token}. Evidencias: test-results/evidencias/CT-E2E-01-acesso-negado.png e CT-E2E-01-acesso-permitido.png.
- Inspecao MCP (Playwright) feita antes da execucao: landing /{token} com textbox 'Telefone' e botao 'Acessar'; sessao MCP fechada.
- Contra Supabase de PRODUCAO por autorizacao do humano, somente OS 026794-026799, telefones ficticios.
- DESVIOS registrados: (1) o qa-automatizador NAO leu os arquivos de harness (agente/skills/rules), seguiu so os achados passados; (2) a inspecao MCP e o pre-voo ocorreram na execucao, e nao antes de escrever o spec (aceito pelo humano no gate implementacao).
- CT-MAN-01 (WhatsApp, URG-10711) continua manual, nao executado.
- Ambiente restaurado (flag=0, BANCO_DADOS_URL=sistemacerttus); 0 links ativos nas OS de teste.
- vereditoSugerido: APROVADO (9 de 9 CTs automatizados passaram: 8 API + 1 E2E; CT-API-06 so Jest; pendente CT-MAN-01).

## Reexecucao com massa propria (OS criada por spec via api-mobile) - ciclo 1d1230b2 (nao fechado, execucoes nao marcadas)
- Comando: `npm run test:portal-link-409` (projeto portal-link-409; setup/teardown da flag; os dois specs em PARALELO, 2 workers, sem --workers=1), com PORTAL_ALLOW_PROD_WRITE=1, TOUCH_API_OS_GRAVAR=1, PORTAL_ACEITA_WHATSAPP_REAL=1 so na sessao.
- Tentativa 1: falhou por TESTE (helper portalApiMobile.ts exigia HTTP 200 e a api-mobile devolve 201 ao criar a OS). Criou 2 OS (026846 api, 026847 e2e) que ficaram sem registro; corrigido o helper para aceitar 200/201. Classificacao: teste, nao produto.
- Tentativa 2: **11 passed (14,3 s)**: setup, teardown, 8 CTs de API (CT-API-01,02,03,04,05,07,08,09) e CT-E2E-01 (Acesso negado). Isolamento comprovado: cada spec com OS propria (026848 api; 026849 e2e), em paralelo.
- Supabase de PRODUCAO (fhyqbokzmolqtxwufklk), por autorizacao do humano; escrita somente em links das OS criadas pelo teste (026846-026849) com opt-in PORTAL_ALLOW_PROD_WRITE=1. Os links ativos das 026846/026847 (orfas da tentativa 1) foram revogados via /revogar apos confirmar o marcador QA-AUTO URG10463 em pcrtase0. 0 links ativos nas 4 OS. A OS 026845 NAO foi criada pelo teste e nao foi tocada.
- WhatsApps REAIS: ao criar cada OS a api-mobile envia o link ao celular da OS = celular do QA (mascarado 46991****; variavel PORTAL_TELEFONE_QA_REAL em .env.local, unico numero real aceito pelo guard). 4 OS criadas = ate 4 mensagens (2 na tentativa 1, 2 na tentativa 2). Telefone B ficticio (47999990001).
- OS deixadas abertas em Recepcao com marcador "QA-AUTO URG10463 ..." (026846, 026847, 026848, 026849); sem cancelamento (decisao do humano).
- Flag portalclienteutilizar empresa 0001: base 1, restaurada para 1 pelo teardown. BANCO_DADOS_URL/.env do api-microservicos e api-mobile NAO alterados.
- Desvios: (1) qa-automatizador da 1a passada nao leu os arquivos de harness (corrigido na passada de ajuste, que os leu); (2) inspecao MCP/pre-voo na execucao, nao antes do codigo (aceito); nesta rodada o pre-voo (servicos 8085/8086/3333/3000/8080) foi feito e a inspecao MCP da landing foi feita na rodada anterior; a tela /os/{token} nao foi reinspecionada via MCP.
- Pendencias humano: provisionar Supabase dev/homolog e definir PORTAL_MS_SUPABASE_ENV=dev; ROTACIONAR SUPABASE_SERVICE_ROLE_KEY e MELOQA_API_TOKEN (expostos no chat); decidir sobre as 4 OS abertas; commit do codigo novo (package.json/package-lock com pg).
- vereditoSugerido: APROVADO; CT-MAN-01 (WhatsApp, URG-10711) segue sem resultado.

## Veredito final (Gate C)
- Humano: aprovar_com_ressalva => APROVADO. CT-MAN-01 (WhatsApp, URG-10711 em Fazendo) registrado como "Nao aplica nesta rodada / ressalva": so pode ser validado quando a URG-10711 for concluida.
