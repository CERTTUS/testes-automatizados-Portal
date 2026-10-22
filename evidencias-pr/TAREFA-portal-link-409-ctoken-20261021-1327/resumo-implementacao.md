# Resumo da implementação — portal-link-409-ctoken

> Teste: URG-10835 | Pai: URG-10463 | Modalidades: API (Playwright `request`) + E2E (CT-E2E-01)
> Revisão 2026-10-21 (2): **cada spec cria a própria OS no `beforeAll` via api-mobile** (substitui as OS fixas 026794-026799). Mantém flag automática, sonda do banco do MS, guarda de produção.
> Status: implementado; `npx tsc --noEmit` sem erros novos (só os 5 antigos de `fixtures.ts`) e `playwright test ... --list` = 11 testes. **Não executado** (nenhuma gravação de OS, link ou UPDATE nesta revisão).

## Como rodar (sem `--workers=1`)

```powershell
cd "C:\Users\erick.felipe\Documents\GitHub CERTTUS\testes-automatizados-Portal"
$env:TOUCH_API_OS_GRAVAR='1'          # autoriza gravar OS no banco LOCAL via api-mobile (nunca produção)
$env:PORTAL_ALLOW_PROD_WRITE='1'      # Supabase de produção (opt-in; não gravar no .env.local)
$env:PORTAL_ACEITA_WHATSAPP_REAL='1'  # só se decidir aceitar o risco de WhatsApp (ver Riscos); senão desligue o envio na empresa 0001
npm run test:portal-link-409          # = npx playwright test --project=portal-link-409
```

O projeto `portal-link-409` depende de `portal-link-409-setup` e tem `teardown` em `portal-link-409-teardown`. Os dois specs rodam em paralelo (cada um com a sua OS). Stop-on-fail padrão (`maxFailures=1`). O projeto `chromium` não roda este módulo (`testIgnore`).

## Pré-requisitos

1. `.env.local`: `PORTAL_MS_CHAVEAPI`, `PORTAL_MS_BASE_URL` (local), `PORTAL_MS_DATABASE`, **`PORTAL_TEST_DB_URL`** (`postgresql://...@localhost:5432/portaldocliente`), **`PORTAL_APIMOBILE_USUARIO`** e **`PORTAL_APIMOBILE_SENHA`** (novos; valores em `harness-handoff.json` → `loginTeste`), opcional `PORTAL_MS_SUPABASE_ENV=prod|dev` (ausente = prod).
2. api-mobile local no ar (`PORTAL_APIMOBILE_BASE`, padrão `http://localhost:8086/api/v1`), apontando para `portaldocliente`.
3. API de microserviços local (:8085) com o `.env` atual (NUVEM + catálogo `sistemacerttus` contendo `PORTALDOCLIENTE`), branch `urgente/URG-10463`; `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` reais.
4. Portal web em :3000 e BFF `portalcliente-api` em :3333 (CT-E2E-01).
5. Na sessão: `TOUCH_API_OS_GRAVAR=1`, `PORTAL_ALLOW_PROD_WRITE=1`.
6. Ciclo MeloQA (AskQuestion) antes de executar e inspeção MCP/pré-voo imediatamente antes da suíte (seletores do CT-E2E-01 ainda não confirmados ao vivo).

## Massa necessária

Status: **parcial / pendente-humano** (origem: `api` + `banco` + `humano`; detalhes em `massa-local.md`).

- Operação, cliente e demais cadastros: descobertos em runtime por `GET` (operação 1ª de `/operacoes?aberturaOrdemServico=1`; cliente = consumidor final `0000035` via `/ordensservico/configuracoes/0001`, **cliente sem cadastro**). Veículo, mecânica e motor **não são necessários** na Recepção com cliente sem cadastro; só entram via `PORTAL_OS_VEICULO/MECANICA/MOTOR`.
- O que falta (humano): credenciais da api-mobile e `PORTAL_TEST_DB_URL` no `.env.local`; decisão sobre WhatsApp; decisão sobre cancelamento das OS criadas.

## 1. Flag do Portal (empresa 0001)

Inalterado: `portalclienteutilizar` é habilitado **uma vez por execução** no setup e restaurado no teardown (estado e contagem de referência em `.portal-state/portal-flag-0001.json`, trava, conferência na restauração, guarda `localhost` + `portaldocliente`). Observação de 2026-10-21: o banco já está com a flag `= 1` e sem `.portal-state`; o "original" salvo será `1`.

## 2. Banco do MS × OS criada pela api-mobile

Sem conflito (ver `massa-local.md` → Investigação): api-mobile em modo LOCAL grava em `portaldocliente`; o MS em modo NUVEM resolve `cDatabase=portaldocliente` pelo catálogo `sistemacerttus.bancosdados` (`PORTALDOCLIENTE` → 127.0.0.1:5432) e lê `pcmtemp0`/`pcrtase0`/flags nesse mesmo banco. Não é preciso editar o `.env` do api-microservicos nem criar tabelas em outro banco. A sonda do setup (empresa `9999`, sem gravação) cobre MS em LOCAL com banco errado e MS em NUVEM sem `PORTALDOCLIENTE` no catálogo; após criar a OS, um `SELECT` em `pcrtase0` confirma que ela está no banco de `PORTAL_TEST_DB_URL`.

## 3. Criação da OS por spec

- `tests/e2e/helpers/portalApiMobile.ts` (novo): porte TS fino do Touch (`apiTouchHelper.js` / `portalClienteApiHelper.js`): pré-requisitos de env, sonda da api-mobile, login (serial já vinculado via SELECT em `mobiledispositivos` ou env), descoberta (`GET`) e `POST /ordensservico` (fase `D`, cliente sem cadastro, `clienteCelular` fictício `11999990001`, marcador `QA-AUTO URG10463 <spec> <runId>`).
- `tests/e2e/helpers/portalMassaOs.ts` (novo): `prepararOsDoSpec` (beforeAll: reaproveita o registro se o worker reiniciou, cria, **registra antes de validar**, confere empresa `0001` e presença em `pcrtase0`, espera e revoga o link que a própria api-mobile emite ao gravar) e `encerrarOsDoSpec` (afterAll: revoga o link e marca o registro; usa o registro, então limpa mesmo se o beforeAll falhou depois de criar a OS).
- Registro: `.portal-state/os-criadas/<PORTAL_RUN_ID>/<spec>.json` (empresa, número, série, telefone, marcador, criada em, encerramento). `PORTAL_RUN_ID` nasce em `playwright.config.ts` e é herdado pelos workers.
- Decisão de porte: **TS fino chamando a mesma API HTTP** (em vez de importar o JS do Touch ou rodar `massa:descobrir`): evita acoplar repositórios/stack (WDIO + axios + dotenv do Touch) e permite tipar e validar com `tsc`. O `massa:descobrir` do Touch lista candidatos de cliente/veículo/etc. via login; aqui o modelo mínimo (cliente sem cadastro) dispensa esses cadastros.

## 4. Guardas

`portalGuard.exigirEscritaPermitida` passou a validar **"OS criada pelo próprio teste"** (presença no registro da execução atual) em vez da lista fixa 026794-026799; continuam: empresa `0001`, banco `portaldocliente`, telefones fictícios, API local, opt-in do Supabase. `OS_POR_SPEC`/`OS_PERMITIDAS` foram removidos. Supabase de produção: só links das OS criadas pelo teste + telefones fictícios; `PORTAL_ALLOW_PROD_WRITE=1` permanece.

## 5. Limpeza

- Implementado: revogar o link (`/portal/link/revogar`) no `afterAll` de cada spec.
- **Não implementado** (pendência humana): cancelar a OS. Na api-mobile o único caminho é `PUT /ordensservico/:empresa/:os` com `faseDestino='C'`, que exige reserva da OS, body completo e ao menos 1 peça/serviço (efeito em estoque/financeiro). Sem DELETE/UPDATE direto no banco do ERP. As OS ficam em Recepção com o marcador de QA e são listadas no teardown.

## 6. Paralelismo e evidências

Sem `--workers=1`: `api.spec.ts` (serial interno, uma OS) e `acesso-negado.e2e.spec.ts` (uma OS) não compartilham massa. Evidências inalteradas: cada CT-API anexa `{CT}-response.json` (cToken mascarado) + `{CT}-resumo.md`; E2E com 3 passos + `99-tela-final` (helpers pre-cr). Sem `pause`/`skip`; falta de env falha explícito.

## Riscos

1. **WhatsApp real**: gravar a OS com `portalclienteenviarlinkwhatsapp=1`, WhatsApp conectado e template preenchido pode enviar mensagem ao `11999990001`. Setup fail-closed (`exigirCienciaEnvioWhatsapp`).
2. Flag base hoje `= 1` (era `0` na documentação anterior).
3. Vínculo de dispositivo único por usuário na api-mobile (conflito com emulador do Touch logado).
4. Link automático da api-mobile pode chegar após a janela de espera (`PORTAL_ESPERA_LINK_AUTO_MS`, 8 s); cada CT ainda revoga antes.
5. OS residuais (2 por execução) até decidir o cancelamento.
6. `POST /ordensservico` com `clienteFormatoInformar=2`, sem operação/veículo/motor, nunca foi exercido por este módulo; o contrato foi lido no código (`CriarController`/`OrdemServicoValidar`/`OrdemServicoGravar`) mas não executado.

## Arquivos alterados (antes -> depois)

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `tests/e2e/helpers/portalGuard.ts` | Lista fixa de OS (026794-026799) e `OS_POR_SPEC` | Registro de OS criadas (`registrarOsCriada`, `osCriadaPeloTeste`, `runIdAtual`); guarda por "OS criada pelo teste" |
| `tests/e2e/helpers/portalApiMobile.ts` | — | Novo: cliente HTTP da api-mobile (login, descoberta, criar OS) |
| `tests/e2e/helpers/portalMassaOs.ts` | — | Novo: `prepararOsDoSpec` / `encerrarOsDoSpec` |
| `tests/e2e/helpers/portalLink.ts` | `revogarLinkDaOs` com asserção | + `revogarLinkStatus` (sem asserção, usado na espera do link automático) |
| `tests/e2e/helpers/portalPreflight.ts` | Sonda do banco (LOCAL) | + mensagens para NUVEM/catálogo; + `exigirCienciaEnvioWhatsapp` |
| `.../_ambiente/flag.setup.ts` | Guardas + sonda + flag | + pré-requisitos de criação de OS, sonda da api-mobile, login, ciência WhatsApp |
| `.../_ambiente/flag.teardown.ts` | Restaura a flag | + lista as OS criadas na execução |
| `.../api.spec.ts` | `OS_POR_SPEC` (5 OS fixas) | `beforeAll` cria 1 OS (`spec=api`), `afterAll` revoga link; todos os CTs usam essa OS |
| `.../acesso-negado.e2e.spec.ts` | OS fixa 026799 | `beforeAll` cria 1 OS (`spec=e2e-acesso-negado`) |
| `playwright.config.ts` | — | + `PORTAL_RUN_ID` |
| `.env.example` | Variáveis MS/Supabase | + variáveis da api-mobile/OS/WhatsApp |
| `docs/.../massa-local.md`, `cenarios.md`, `escopo.md`, `resumo-implementacao.md` | OS fixas | Novo modelo de massa |

## Pendências para o humano

1. `.env.local`: `PORTAL_TEST_DB_URL`, `PORTAL_APIMOBILE_USUARIO`, `PORTAL_APIMOBILE_SENHA` (cópia automática bloqueada por política).
2. Decidir o risco de WhatsApp (desligar envio na 0001 ou `PORTAL_ACEITA_WHATSAPP_REAL=1`).
3. Decidir o cancelamento das OS criadas (manter abertas em Recepção ou autorizar PUT de cancelamento com item sintético).
4. Confirmar flag base `= 1`.
5. Provisionar Supabase dev/homolog (hoje produção por autorização); **rotacionar** `SUPABASE_SERVICE_ROLE_KEY` e `MELOQA_API_TOKEN` (expostos no chat).
6. Helpers pre-cr seguram a tela 6 s e sem selo (rule pede 12 s + selo): ajuste à parte.
7. Antes de executar: ciclo MeloQA + pré-voo + inspeção MCP da landing e de `/os/{token}` + `seletores.md`.
