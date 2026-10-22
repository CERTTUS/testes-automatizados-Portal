# Massa local — portal-link-409-ctoken

> Teste: URG-10835 | Pai: URG-10463 | Levantamento inicial em 2026-10-21 (somente leitura); **revisado em 2026-10-21 para o modelo "cada spec cria a própria OS"** (humano aprovou).
> Origem das informações: `codigo` (api-microservicos, api-mobile) · `banco` (Postgres local, só SELECT em transação `READ ONLY`) · `humano` (pendente). Credenciais e URL do banco ficam em `harness-handoff.json` (`bancoTeste`, `loginTeste`); não repetidas aqui. Nenhuma chave, senha ou telefone real foi gravado neste arquivo.

## Modelo de massa (vigente)

- **Cada arquivo de spec cria a PRÓPRIA OS no `beforeAll`** via api-mobile (`POST /ordensservico`) e usa somente ela. As OS fixas 026794-026799 **não são mais usadas**.
- Autorização do humano: gravar OS reais no banco **LOCAL** do ERP (`portaldocliente`, `localhost`) via api-mobile com `TOUCH_API_OS_GRAVAR=1`. **Não vale para produção** (a api-mobile alvo precisa ser `localhost`/`127.0.0.1`).
- Cada OS criada é registrada em `.portal-state/os-criadas/<runId>/<spec>.json` (empresa, número, série, telefone, marcador, criada em, encerramento). `runId` = `PORTAL_RUN_ID`, definido em `playwright.config.ts`.
- Guardas (`portalGuard.exigirEscritaPermitida`): só empresa `0001`, banco `portaldocliente`, **OS presente no registro da execução atual (criada pelo próprio teste)**, telefones fictícios e opt-in do Supabase. OS de execução anterior, de outra pessoa ou do Touch são recusadas.
- Specs: `api.spec.ts` (spec `api`, CT-API-01 a 05, 07, 08, 09 na mesma OS, em série, com revogação do link antes/depois de cada CT) e `acesso-negado.e2e.spec.ts` (spec `e2e-acesso-negado`, CT-E2E-01, OS própria). Arquivos distintos rodam em paralelo; **não precisa `--workers=1`**.
- Telefones continuam fictícios: A `11999990001`, B `11999990002`, C `47999990001`; inválido `123` (só CT-API-05).

## Resumo

| Item | Situação |
|------|----------|
| API MS no ar (`localhost:8085`) | OK — 401 sem `chaveapi` |
| api-mobile no ar (`localhost:8086`, `/api/v1`) | OK — 401 sem token (GET sem login, nada gravado) |
| Portal web (:3000) e BFF (:3333) | OK — respondem (3000 → 307, 3333 → 404 na raiz) |
| Banco que o MS enxerga a OS criada pela api-mobile | **OK, mesmo banco** (`portaldocliente`) — ver "Investigação" |
| Flag `portalclienteutilizar` (empresa 0001) | Hoje `= 1` no banco (SELECT em 2026-10-21; **não** é o `0` documentado antes e não há `.portal-state`). Ver "Riscos" |
| OS de teste | Criada em runtime por spec (não há massa fixa) |
| Credenciais da api-mobile para o teste | **FALTA no `.env.local`**: `PORTAL_APIMOBILE_USUARIO`/`PORTAL_APIMOBILE_SENHA` (valores em `harness-handoff.json` → `loginTeste`) |
| `PORTAL_TEST_DB_URL` no `.env.local` | **FALTA** (já era pendência) |
| `TOUCH_API_OS_GRAVAR=1` | Exigido via env na sessão de execução |
| Catálogo `os_link_publico` (Supabase) | Produção, autorizada só para links das OS criadas pelo próprio teste (ver "Supabase") |
| Telefones | OK — fictícios |

## Rota, autenticação e payload (lido em `api-microservicos`)

| Item | Valor | Origem |
|------|-------|--------|
| URL | `POST http://localhost:8085/api/v1/servicos/portal/link` | `.env` (`API_PORTA=8085`, `API_VERSAO=1`), `src/rotas.ts` |
| Autenticação | header `chaveapi` com 40 caracteres, validado contra a tabela `microservicosusuarios` (middleware `chaveApiValidar`). **Não há JWT/Bearer nem o login CERTTUS/ENTRA nesta rota.** Sem header, tamanho diferente de 40 ou chave inexistente: 401 | `src/middlewares/chaveApiValidar.ts` |
| Chaves existentes | Usuários `api-mobile`, `talk-hub`, `talk-ops` (cada um com chave de 40 caracteres) | `banco` |
| Como obter a chave | Usar `API_MICROSERVICOS_CHAVEAPI` do `.env` de `portalcliente-api` (casa com `talk-hub`) ou a chave do usuário `api-mobile`: `SELECT usuario, chaveapi FROM microservicosusuarios` no `portaldocliente`. Guardar em variável de ambiente do repo de testes (ex.: `PORTAL_MS_CHAVEAPI` em `.env.local`, gitignored). Nunca em Markdown | `banco` / `humano` |
| Content-Type | `application/json` | — |

Corpo (Joi em `PortalLinkEmitirController`, todos obrigatórios exceto `cBucket`):

```json
{
  "cDatabase": "portaldocliente",
  "cEmpresa": "0001",
  "cOrdemServico": "<6 chars>",
  "cSerie": "SR",
  "cTelefone": "<telefone BR válido>",
  "cBucket": "(opcional)"
}
```

Limites: `cDatabase` até 60, `cEmpresa` até 4, `cOrdemServico` até 6, `cSerie` até 4, `cTelefone` até 32 caracteres.

Respostas relevantes: 200 `{lSucesso:true, oDados:{cToken, lHashAtualizado}}` · 409 `{lSucesso:false, cMensagem, oDados:{cToken, lHashAtualizado:false}}` (novo) · 400 corpo inválido (Joi, inclui `cTelefone` ausente ou vazio) · 422 telefone inválido ou empresa/Portal não elegível · 401 sem chave.

Observações do código que afetam os CTs:

- O tenant lido pelo MS depende de `BANCO_DADOS_TIPO`: `LOCAL` = banco de `BANCO_DADOS_URL` (`cDatabase` só entra na chave do link, em minúsculas); `NUVEM` (**valor atual do `.env` do api-microservicos**) = resolve `cDatabase` no catálogo `sistemacerttus.bancosdados` → `rdsservidores` e conecta no banco de mesmo nome. Usar sempre `cDatabase=portaldocliente` nos CTs (ver "Investigação").
- `cTelefone` vazio ou ausente cai no Joi e devolve **400**, não 422 (o 422 "Telefone é obrigatório" do serviço é inalcançável por HTTP). Por isso CT-API-04 espera 400; o `escopo.md` cita 422 para "sem celular" e deve ser ajustado.
- A emissão não valida status da OS nem existência dela no tenant (só empresa e flags); basta `cEmpresa` elegível. Mesmo assim usar OS reais e não canceladas para a landing/CT-3.
- O hash do telefone usa `PORTAL_TELEFONE_PEPPER`; `api-microservicos/.env` e `portalcliente-api/.env` têm valores diferentes hoje (`pepper_dev` x outro). Não afeta a emissão, mas afeta o CT-MAN-02 (validar acesso no portal). Alinhar antes do manual.

## Banco `portaldocliente` (tenant ERP + usuários do MS)

PostgreSQL 15.17 em `localhost:5432`. Tabelas do ERP legado relevantes: `pcrtase0` (OS), `pcmtemp0` (empresa), `configuracoesservicosordemservicofluxo` (flags do Portal). O banco `sistemacerttus` é o **catálogo** (`bancosdados`, `rdsservidores`, `microservicosusuarios`, ...), não um tenant: não tem `pcmtemp0`/`pcrtase0`.

### Empresas (`pcmtemp0`)

| Código | Fantasia | Atividade | Elegível (4 ou 5) |
|--------|----------|-----------|-------------------|
| 0001 | BOMBAS DIESEL | 5 | sim — **empresa BOMBAS de teste** |
| 0015 | BOMBAS DIESEL | 5 | sim |
| 0002 a 0006 | demais | 5 | sim |
| 0007 | BD SERVICOS E INJECAO ELETRONICOS | 4 | sim |

### Flags do Portal (`configuracoesservicosordemservicofluxo`)

| Empresa | `portalclienteutilizar` | `portalclientecelularobrigatorio` | `portalclienteenviarlinkwhatsapp` |
|---------|------------------------|-----------------------------------|-----------------------------------|
| 0001 | **1** (em 2026-10-21; nos levantamentos anteriores era 0) | 1 | 1 |
| 0015 | 0 | 0 | 0 |

A empresa 0001 é a empresa de teste (celular obrigatório e envio por WhatsApp já configurados). O setup do módulo grava `portalclienteutilizar=1` preservando o valor lido (hoje já 1) e o teardown restaura esse valor. Consolidação: `EmpresaConsolidacaoProducao('0001')` = `0001` (a OS e o link usam a mesma empresa). Consumidor final da 0001 = `0000035` (cliente sem cadastro, `evolucaoComunicar=1`).

### OS (`pcrtase0`)

Não há mais OS reservada. As OS de QA aparecem em `pcrtase0` (empresa `0001`, série `SR`, fase `D` Recepção) com cliente **sem cadastro** (consumidor final `0000035`) e descrição `QA-AUTO URG10463 <spec> <runId>` (campo `DESCRI`, máx. 40 caracteres), celular fictício `11999990001`. Em 2026-10-21 a maior OS era a 026843 (OS de outras automações/pessoas no mesmo banco); a suíte **não toca** nelas.

### Telefones de teste (payload)

Números fictícios válidos para o `libphonenumber` BR (verificados contra a lib do projeto): A = `11999990001`, B = `11999990002`, C = `47999990001`. Inválido para CT-API-05: `123`.

## Investigação: banco que o MS enxerga × OS criada pela api-mobile (somente leitura)

Conclusão: **não há conflito de banco**. A OS criada pela api-mobile aparece para o MS, **sem** repontar o `.env` do api-microservicos e **sem** precisar de `pcmtemp0`/`pcrtase0` em outro lugar.

| Peça | Configuração lida (sem segredos) | Banco efetivo |
|------|----------------------------------|---------------|
| api-mobile (`api-mobile/.env`) | `BANCO_DADOS_TIPO=LOCAL`, `BANCO_DADOS_URL=.../portaldocliente` (localhost:5432), `API_PORTA=8086` | `portaldocliente` (grava OS em `pcrtase0` e lê flags de `configuracoesservicosordemservicofluxo`) |
| api-mobile → MS | `PortalClienteLink.emitirOuAtualizar` envia `cDatabase` = nome extraído da URL local = `portaldocliente`, `cEmpresa` = consolidadora da produção (0001) | — |
| api-microservicos (`.env`, branch `urgente/URG-10463`) | `BANCO_DADOS_TIPO=NUVEM`, `BANCO_DADOS_URL=.../sistemacerttus` (comentário no arquivo: catálogo MS = sistemacerttus, ERP tenant da api-mobile = portaldocliente) | Em NUVEM o MS usa `sistemacerttus` **só como catálogo**: `BancoDadosPool.bancoDadosNuvemConectar('portaldocliente')` busca `bancosdados.descricao='PORTALDOCLIENTE'` → `rdsservidores` e conecta em `portaldocliente` |
| Catálogo `sistemacerttus.bancosdados` | existe `PORTALDOCLIENTE` → `rdsservidor 2` (`localhost dev`, 127.0.0.1:5432). Também existem `BOMBAS`, `demonstracao`, `itamec`, `MOLACO` → rdsservidor 1 (**192.168.100.83, servidor remoto**) e `tatsch1602` → rdsservidor 2 | `portaldocliente` local |
| Setup da suíte | `PORTAL_TEST_DB_URL` (guarda: localhost + `portaldocliente`) usada para o `UPDATE` da flag e para o `SELECT` que confere a OS | `portaldocliente` local |

- O MS lê no tenant: empresa (`pcmtemp0`), flags (`configuracoesservicosordemservicofluxo`) e, na landing/validação, a OS (`pcrtase0`: celular e status). A emissão (`linkEmitir`) não exige que a OS exista, mas o CT-E2E-01 (landing, `/os/{token}`) exige. Como api-mobile e MS usam `portaldocliente`, a OS criada é vista pelo MS.
- Histórico: a falha `relation "pcmtemp0" does not exist` da 1ª execução vinha do MS em modo `LOCAL` com `BANCO_DADOS_URL=.../sistemacerttus`. Hoje o `.env` está em `NUVEM`, que resolve pelo catálogo; **não é preciso alterar o `.env`**. A **sonda do setup** (POST `/portal/link` com empresa `9999`) continua valendo nos dois modos e falha com mensagem clara se o MS em execução (que pode ter sido iniciado com `.env` antigo) ainda lê o banco errado ou não acha `PORTALDOCLIENTE` no catálogo.
- Verificação pós-criação (no `beforeAll`): `SELECT` em `pcrtase0` do `PORTAL_TEST_DB_URL` confirma que a OS recém-criada está nesse banco; se não estiver (api-mobile apontando para outro banco, ex. `tatsch1602`/`BOMBAS`), o spec falha com explicação e **nenhuma emissão é feita**.
- Guarda da flag: continua só `portaldocliente` local (coerente: api-mobile LOCAL, MS NUVEM via catálogo e `PORTAL_TEST_DB_URL` apontam para o mesmo banco). **needs_human se** api-mobile ou MS passarem a apontar para outro banco (ex.: tenant `BOMBAS` remoto em 192.168.100.83): a suíte recusa, não adapta.
- Limite da investigação: o processo do MS em execução pode ter sido iniciado antes da mudança do `.env`; só a sonda do setup (HTTP) confirma o que está efetivamente no ar. Não executada nesta revisão.

## Criação da OS (api-mobile) — como a massa é descoberta

Porte TS fino em `tests/e2e/helpers/portalApiMobile.ts` + `portalMassaOs.ts` (chama os mesmos endpoints HTTP validados no repo Touch: `/autenticacao/login`, `GET /operacoes`, `GET /ordensservico/configuracoes/:empresa`, `POST /ordensservico`). Não importa código JS do Touch (outro repo, stack WDIO/axios).

| Item | Como é obtido | Origem |
|------|---------------|--------|
| Login | `PORTAL_APIMOBILE_USUARIO` / `PORTAL_APIMOBILE_SENHA` (env); serial de dispositivo: `PORTAL_APIMOBILE_DISPOSITIVO_SERIAL` ou os já vinculados em `mobiledispositivos` (SELECT; existe 1 vínculo, o do emulador padrão) | humano (credencial) + banco |
| Operação | `PORTAL_OS_OPERACAO` ou 1ª de `GET /operacoes?aberturaOrdemServico=1` (320 operações ativas no banco; opcional na fase Recepção) | api |
| Cliente | **Cliente sem cadastro** (`clienteFormatoInformar=2`): grava o consumidor final `0000035` (`GET /ordensservico/configuracoes/0001` → `consumidorFinalCodigo`) com descrição de QA e `clienteCelular` fictício. Evita cliente real e garante que o celular da OS/link seja o fictício | api |
| Veículo, mecânica, motor | **Dispensados**: na fase Recepção a validação exige só "cliente ou motor ou checklist" (formato 2 satisfaz). Só entram se `PORTAL_OS_VEICULO`/`MECANICA`/`MOTOR` forem definidos | — |
| Peças / serviços | Nenhum (Recepção não exige) | — |
| Fase | `D` (Recepção) | — |

Confirmado no código: ao gravar a OS, a api-mobile **emite o link sozinha** (assíncrono, best-effort) com o celular da OS. O `beforeAll` espera esse link (até `PORTAL_ESPERA_LINK_AUTO_MS`, padrão 8 s), revoga, e só então os CTs começam com a OS "sem link ativo".

## Pré-checagens (setup, antes de qualquer gravação de OS)

Falham com mensagem clara listando o que falta: `TOUCH_API_OS_GRAVAR=1`; `PORTAL_APIMOBILE_USUARIO`/`SENHA`; api-mobile no ar (`PORTAL_APIMOBILE_BASE`, padrão `http://localhost:8086/api/v1`, só host local); login na api-mobile; `PORTAL_MS_CHAVEAPI`; `PORTAL_TEST_DB_URL`; sonda do banco do MS; opt-in `PORTAL_ALLOW_PROD_WRITE=1` (Supabase produção); ciência de WhatsApp (riscos).

## Limpeza no afterAll

| Ação | Como | Situação |
|------|------|----------|
| Revogar o link da OS | `POST /servicos/portal/link/revogar` (soft: `revogado_em`) | **Implementado** |
| Cancelar/encerrar a OS no ERP | Investigado em `api-mobile`: não há endpoint dedicado de cancelamento. O único caminho é `PUT /ordensservico/:empresa/:os` com `faseDestino='C'` (`CANCELADA`, que também revoga o link). Esse PUT exige OS reservada ao usuário (reserva por GET), body completo com `faseAtual`, e a validação `dadosObrigatoriosValidar` **exige ao menos 1 peça ou serviço** em fases além de Recepção/Diagnóstico/Atualização de preços, isto é, lançar item de estoque/serviço apenas para cancelar | **Não implementado** (sem forma segura sem decisão humana). OS fica aberta em Recepção, identificável pelo marcador `QA-AUTO URG10463 ...`, listada no teardown e em `.portal-state/os-criadas/` |
| DELETE/UPDATE direto no banco do ERP | — | **Proibido** (não feito) |

## Riscos específicos do novo modelo

1. **WhatsApp real**: com `portalclienteenviarlinkwhatsapp=1` na 0001, `whatsapps` ativo/conectado, template do link preenchido e consumidor final com `evolucaoComunicar=1`, a gravação da OS pode **enviar WhatsApp** ao `11999990001` (WHATSAPP_API_URL=127.0.0.1:8080 responde). O setup é fail-closed: exige `PORTAL_ACEITA_WHATSAPP_REAL=1` ou que o envio seja desligado na empresa de teste. (Pacote de integração contratado não verificável por SELECT simples.)
2. **Flag hoje = 1**: o banco está com `portalclienteutilizar=1` e sem `.portal-state`; o setup guardará `1` como "original" e restaurará `1`. Confirmar que esse é o estado base desejado (a documentação anterior dizia `0`).
3. **Vínculo de dispositivo**: o login reaproveita um serial já vinculado (1 dispositivo por usuário na api-mobile). Se o emulador do Touch estiver logado com o mesmo usuário, pode haver conflito de sessão.
4. **Link automático tardio**: se a emissão assíncrona da api-mobile chegar depois da janela de espera, o 1º CT pode ver um link ativo; o `beforeEach` de cada CT revoga antes, mas a janela existe.
5. **OS residuais**: cada execução deixa 2 OS abertas em Recepção (uma por spec) até haver decisão sobre cancelamento.

## Supabase (os_link_publico) — PRODUÇÃO autorizada pelo humano (guardrails revisados)

- Projeto `fhyqbokzmolqtxwufklk` é PRODUÇÃO; uso autorizado explicitamente (gate implementação); opt-in `PORTAL_ALLOW_PROD_WRITE=1` permanece.
- **Guardrails novos:** escrever somente em links das **OS criadas pelo próprio teste** (registro da execução) + telefones fictícios (11999990001, 11999990002, 47999990001). Proibido DELETE/UPDATE em massa ou sem filtro. Limpeza só via `POST /servicos/portal/link/revogar`. Qualquer passo fora disso: PARAR (`needs_human`).
- O link emitido automaticamente pela api-mobile ao gravar a OS também cai nesse catálogo (OS do teste, telefone fictício) e é revogado no `beforeAll`.
- `resultado-execucao.md` deve registrar que a corrida rodou contra Supabase de produção por autorização do humano e quais OS foram criadas (número/empresa/série).

## O que falta (ação humana) — resumo

| # | Falta | Como coletar |
|---|-------|--------------|
| 1 | `PORTAL_APIMOBILE_USUARIO` e `PORTAL_APIMOBILE_SENHA` no `.env.local` | `loginTeste` do `harness-handoff.json` (cópia automática bloqueada por política; fica manual) |
| 2 | `PORTAL_TEST_DB_URL` no `.env.local` | `bancoTeste` do `harness-handoff.json`, `localhost:5432/portaldocliente` |
| 3 | Decisão sobre WhatsApp (risco 1) | desligar envio de link por WhatsApp na empresa 0001, ou aceitar com `PORTAL_ACEITA_WHATSAPP_REAL=1` |
| 4 | Decisão sobre cancelamento das OS criadas | ver "Limpeza" |
| 5 | `TOUCH_API_OS_GRAVAR=1` e `PORTAL_ALLOW_PROD_WRITE=1` | exportar na sessão de execução |
| 6 | Confirmar flag base = 1 (risco 2) e MS no ar com o `.env` atual (NUVEM) | a sonda do setup valida |
| 7 | Pepper alinhado só para CT-MAN-02 manual | igualar `PORTAL_TELEFONE_PEPPER` nos dois `.env` |
| 8 | Token MeloQA | `MELOQA_API_TOKEN` só se for publicar/sincronizar |

## Histórico (rodadas anteriores com OS fixas 026794-026799 — substituído)

- 1ª bateria: CT-API-01 falhou com 500 `pcmtemp0` (MS em LOCAL lendo `sistemacerttus`); contornado na época trocando `BANCO_DADOS_URL` do MS e restaurado depois. Hoje o MS em NUVEM resolve pelo catálogo.
- Supabase produção: 11 linhas (1ª bateria) + 2 (rodada E2E) nas OS 026794-026799, todas com `revogado_em` preenchido (0 ativas); nenhuma linha deletada.
- Flag: habilitada/restaurada manualmente nas rodadas antigas; agora automática (projetos setup/teardown, estado em `.portal-state/portal-flag-0001.json`, `refs`, trava, conferência na restauração).
