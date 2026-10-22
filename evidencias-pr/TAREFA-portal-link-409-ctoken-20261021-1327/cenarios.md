# Cenários de teste — portal-link-409-ctoken

> Produto: **Portal do Cliente** (`portal`) | Plataforma: API HTTP (microserviço `api-microservicos`), sem tela nova
> Teste: **URG-10835** | Pai: **URG-10463** (Bug) | Dev: **URG-10710** | PR: https://github.com/CERTTUS/api-microservicos/pull/22
> Base: `contexto-pr.md`, `review-pre-cr.md` (Lacunas E2E), `escopo.md` (aprovado: `regressao-dominio`)
> Stack: API (HTTP) · E2E Playwright (portal web, fluxo real) · Manual (WhatsApp)
> Formato: **Título → Descrição → Cenário (BDD)** · passos no **infinitivo**
> MeloQA: 11 CTs publicados em 2026-10-21 (pasta `Link Portal 409`); ver `meloqa-sync.md`.
> **Massa (revisada 2026-10-21):** cada arquivo de spec cria a PRÓPRIA OS no `beforeAll` via api-mobile (banco local, fase Recepção, cliente sem cadastro, celular fictício) e usa somente ela; não há mais OS fixas. Detalhes em `massa-local.md`.

## Legenda

| Tag | Significado |
|-----|-------------|
| **[EXISTE]** | Já coberto (Jest da PR) |
| **[NOVO]** | Cenário novo — candidato a automação |

**Modalidades:** `manual` · `automacao-api` · `automacao-e2e`
**Prioridade:** P0 · P1 · P2

## Classificação (qa-automacao-sem-humano)

| CT | Modalidade | Motivo |
|----|-----------|--------|
| CT-API-01 a CT-API-05, CT-API-07 a CT-API-09 | `automacao-api` | HTTP puro com header `chaveapi`; o runner chega a PASS sozinho (desde que a massa de `massa-local.md` esteja pronta) |
| CT-API-06 | cobertura Jest (sem spec HTTP) | Conflito de token UNIQUE não é reproduzível por HTTP: o token é CSPRNG gerado pela API |
| CT-MAN-01 (roteiro CT-1) | `manual` / ASSISTIDO | Depende de api-mobile e WhatsApp real |
| CT-E2E-01 (ex CT-MAN-02, roteiro CT-3) | `automacao-e2e` | Humano aprovou automatizar: o celular "diferente" é só outro valor digitado no formulário do portal (sem dispositivo físico); seletores existentes, fluxo real (link via API + portal + BFF) |

Mapeamento com o roteiro do Dev (customfield_10894): CT-1 = CT-MAN-01 · CT-2 = CT-API-01 a CT-API-09 · CT-3 = CT-E2E-01 (antes CT-MAN-02).

---

## 1. API

**Funcionalidade:** Emissão de link público da OS — `POST /api/v1/servicos/portal/link` (header `chaveapi`). O 409 de conflito com link ativo de outro telefone passa a devolver `oDados.cToken` com `lHashAtualizado: false`.

### CT-API-01 — Emitir link em paralelo com telefones diferentes devolve 200 e 409 com cToken

**Descrição:**
Validar a correção principal do bug: na corrida de emissão para a mesma OS com telefones diferentes, a requisição que perde a corrida recebe 409 com o token do link ativo, em vez de 409 sem token. Como a corrida real é não determinística, o caso repete até N tentativas e exige ao menos um par 200/409.

**Tag:** [NOVO] · **Prioridade:** P0 · **Modalidade:** `automacao-api`
**meloqaId:** `a44d28a3-19d0-443a-8ebe-910e7cc1f08e`  
**Pré-requisitos:** empresa com Portal habilitado e OS criada pelo próprio spec (`beforeAll`, sem link ativo; ver `massa-local.md`); revogar o link da OS antes e depois de cada tentativa.

**Cenário de teste:**

```gherkin
Cenário: Corrida com telefones diferentes devolve 409 com o token do link ativo
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando enviar duas requisições POST /servicos/portal/link em paralelo para a mesma OS com telefones diferentes
  Então retornar HTTP 200 para uma das requisições, com oDados.cToken preenchido
  E retornar HTTP 409 para a outra requisição com lSucesso false e cMensagem preenchida
  E incluir no 409 o campo oDados.cToken como texto não vazio
  E incluir no 409 o campo oDados.lHashAtualizado igual a false
  E retornar no 409 o mesmo cToken do 200 da requisição vencedora
```

---

### CT-API-02 — Emitir link em paralelo com o mesmo telefone devolve 200 nas duas requisições

**Descrição:**
Validar que a corrida com o mesmo telefone não gera conflito para o cliente: as duas requisições recebem o mesmo token.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `7bdb1886-62bb-454d-a411-47e7883e3be0`  

**Cenário de teste:**

```gherkin
Cenário: Corrida com o mesmo telefone devolve o mesmo token nas duas respostas
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando enviar duas requisições POST /servicos/portal/link em paralelo para a mesma OS com o mesmo telefone
  Então retornar HTTP 200 nas duas requisições
  E retornar o mesmo oDados.cToken nas duas respostas
  E incluir oDados.lHashAtualizado igual a false nas duas respostas
```

---

### CT-API-03 — Emitir link em sequência com telefones diferentes atualiza o telefone do link

**Descrição:**
Validar que a emissão sequencial (sem corrida) com outro telefone continua atualizando o hash do telefone no mesmo token, sem retornar 409.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `b00e9ac8-aabf-4898-8576-8984bdc2e73f`  

**Cenário de teste:**

```gherkin
Cenário: Segunda emissão com telefone diferente atualiza o hash e mantém o token
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando emitir o link da OS com o telefone A
  E emitir o link da mesma OS com o telefone B
  Então retornar HTTP 200 na segunda emissão
  E manter na segunda emissão o mesmo oDados.cToken da primeira
  E incluir na segunda emissão oDados.lHashAtualizado igual a true
```

---

### CT-API-04 — Emitir link sem informar o celular retorna erro de validação

**Descrição:**
Validar que a emissão sem `cTelefone` é rejeitada antes de qualquer gravação. Pelo controller (Joi), o campo ausente ou vazio resulta em HTTP 400; o 422 do serviço ("Telefone é obrigatório") só é alcançável fora do HTTP. O `escopo.md` cita 422: este CT adota 400 por ser o comportamento observável da rota (ajuste confirmado no código).

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `2b263716-093c-4006-b4af-8a0b68c1785a`  

**Cenário de teste:**

```gherkin
Cenário: Emissão sem celular é rejeitada
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando enviar POST /servicos/portal/link sem o campo cTelefone
  Então retornar HTTP 400
  E incluir lSucesso igual a false
  E incluir em cMensagem que cTelefone é obrigatório
  E não criar link ativo para a OS
```

---

### CT-API-05 — Emitir link com telefone inválido retorna 422

**Descrição:**
Validar que um telefone preenchido porém inválido para o Brasil é rejeitado com 422 e não cria link.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `75a92e00-e756-42c2-b50e-ddb3a18e0b1e`  

**Cenário de teste:**

```gherkin
Cenário: Emissão com telefone inválido é rejeitada
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando enviar POST /servicos/portal/link com cTelefone igual a "123"
  Então retornar HTTP 422
  E incluir lSucesso igual a false
  E incluir em cMensagem que o telefone é inválido
  E não criar link ativo para a OS
```

---

### CT-API-06 — Conflito sem link ativo retorna 409 sem oDados

**Descrição:**
Garantir que o 409 de conflito de token (UNIQUE de token sem link ativo para a OS) segue sem `oDados`, como antes da correção. O token é gerado pela API de forma aleatória, então o caso não é reproduzível por HTTP; permanece coberto pelo Jest do controller da PR e **não gera spec HTTP**.

**Tag:** [EXISTE] (Jest `PortalLinkEmitirController.test.ts`) · **Prioridade:** P2 · **Modalidade:** `automacao-api` (cobertura Jest, fora da suíte HTTP)
**meloqaId:** `4acefccd-6d81-4474-b549-4271bf46f0e2`  

**Cenário de teste:**

```gherkin
Cenário: Conflito sem link ativo mantém o 409 sem dados
  Dado ocorrer conflito de unicidade na gravação do link
  E não existir link ativo para a OS ao reler o catálogo
  Quando responder a emissão
  Então retornar HTTP 409 com lSucesso igual a false
  E omitir o campo oDados da resposta
```

---

### CT-API-07 — Reemitir link com o mesmo telefone reaproveita o token sem alterar o contrato do 200

**Descrição:**
Regressão do 200 (mudança aditiva): reemissão com o mesmo telefone devolve o token existente e `lHashAtualizado: false`.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `b9c28666-c89d-4108-82b9-991883ac66a3`  

**Cenário de teste:**

```gherkin
Cenário: Reemissão com o mesmo telefone devolve o token existente
  Dado ter a chave de API válida no header chaveapi
  E existir uma OS elegível sem link ativo
  Quando emitir o link da OS com o telefone A
  E emitir novamente o link da mesma OS com o telefone A
  Então retornar HTTP 200 nas duas emissões
  E retornar o mesmo oDados.cToken nas duas respostas
  E incluir oDados.lHashAtualizado igual a false na segunda resposta
  E manter lSucesso igual a true com cMensagem de link emitido
```

---

### CT-API-08 — Emitir link sem chave de API retorna 401

**Descrição:**
Validar que a rota continua protegida pelo middleware `chaveapi`.

**Tag:** [NOVO] · **Prioridade:** P2 · **Modalidade:** `automacao-api`
**meloqaId:** `24ced1b3-4036-431d-8db8-5d2ee53aa011`  

**Cenário de teste:**

```gherkin
Cenário: Emissão sem chaveapi é negada
  Dado não informar o header chaveapi
  Quando enviar POST /servicos/portal/link com corpo válido
  Então retornar HTTP 401
  E não criar link para a OS
```

---

### CT-API-09 — Perdedor da corrida não altera o telefone do link ativo

**Descrição:**
Validar a regra de negócio: no 409 da corrida o hash do telefone **não** é atualizado. Após a corrida, reemitir com o telefone do vencedor deve retornar o mesmo token sem atualização de hash, e o telefone do perdedor não deve ter sido gravado.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `automacao-api`
**meloqaId:** `0324bf6a-94a6-40c9-9399-1147bd71b8de`  

**Cenário de teste:**

```gherkin
Cenário: Telefone do perdedor da corrida não é gravado no link
  Dado ter ocorrido uma corrida com 200 para o telefone A e 409 para o telefone B na mesma OS
  Quando emitir novamente o link da OS com o telefone A
  Então retornar HTTP 200 com o mesmo oDados.cToken
  E incluir oDados.lHashAtualizado igual a false
```

---

## 2. Smoke automatizado

N/A neste módulo — não há tela nem fluxo de navegação; o recorte rápido é CT-API-01 e CT-API-08 da seção 1.

---

## 3. E2E — Caminho feliz

Coberto na fase positiva do CT-E2E-01 (seção 4): celular cadastrado redireciona para `/os/{token}`.

## 4. E2E — Caminho negativo

### CT-E2E-01 — Bloquear acesso ao Portal com celular diferente (ex CT-MAN-02, roteiro CT-3)

**Descrição:**
Validar que quem abre o link e informa um celular diferente do registrado no link recebe "Acesso não autorizado" (403), permanece na landing e não vê dados da OS, protegendo o token devolvido no 409. Fluxo real, sem mock.

**Tag:** [NOVO] · **Prioridade:** P0 · **Modalidade:** `automacao-e2e`
**meloqaId:** `43121eb0-86bb-4de7-9fff-0baa0d837b32`  
**Spec:** `tests/e2e/specs/portal-link-409-ctoken/acesso-negado.e2e.spec.ts` (OS criada pelo próprio spec no `beforeAll`)
**Pré-requisitos:** portal web (`E2E_BASE_URL`, :3000) e BFF (:3333) no ar; MS :8085 com Portal habilitado na empresa 0001; OS própria criada via api-mobile (:8086); link emitido via `POST /servicos/portal/link` com telefone A (`11999990001`); celular B fictício `47999990001`.

**Cenário de teste:**

```gherkin
Cenário: Celular diferente recebe Acesso não autorizado no Portal
  Dado existir um link do Portal emitido para o celular A
  Quando abrir o link do Portal no navegador
  E informar na tela de validação o número do celular B
  Então exibir a mensagem "Acesso não autorizado" (403)
  E permanecer na tela de validação sem redirecionar
  E não exibir os dados da ordem de serviço
  E, ao informar o celular A, redirecionar para /os/{token} (fase positiva)
```

---

## 5. Manual (WhatsApp)

> Fora da suíte automatizada (modalidade `manual` / ASSISTIDO, decisão do humano no gate `review_pre_cr`). Sem spec, sem execução pelo runner.

### CT-MAN-01 — Receber o link do Portal por WhatsApp (roteiro CT-1)

**Descrição:**
Validar que o cliente da OS recebe a mensagem com o link do Portal no WhatsApp após a OS ser gravada, inclusive quando houve emissão repetida ou concorrente.

**Tag:** [NOVO] · **Prioridade:** P1 · **Modalidade:** `manual`
**meloqaId:** `5835a663-7e99-412d-95a7-870a883f2124`  
**Pré-requisitos:** api-mobile e WhatsApp reais conectados; empresa com Portal e envio por WhatsApp habilitados; celular de teste com acesso físico.

**Cenário de teste:**

```gherkin
Cenário: Cliente recebe o link do Portal por WhatsApp
  Dado estar com a empresa de teste com Portal do Cliente e envio de link por WhatsApp habilitados
  E ter um celular de teste com WhatsApp ativo cadastrado na OS
  Quando gravar a OS pelo aplicativo
  Então receber no WhatsApp do celular de teste a mensagem com o link do Portal
  E abrir o link recebido e exibir a tela de validação de acesso do Portal
```

---

> CT-MAN-02 foi promovido a **CT-E2E-01** (seção 4, automação E2E aprovada pelo humano).

---

> **Aguarda aprovação humana** antes de seguir para o Agente B (`plano-automacao-exec`).
> Pré-condições de execução (ver `massa-local.md`): credenciais da api-mobile no `.env.local`, `TOUCH_API_OS_GRAVAR=1` e `PORTAL_ALLOW_PROD_WRITE=1` na sessão, decisão sobre WhatsApp e sobre cancelamento das OS criadas. A flag do Portal e a OS de cada spec são preparadas automaticamente (setup/`beforeAll`).
