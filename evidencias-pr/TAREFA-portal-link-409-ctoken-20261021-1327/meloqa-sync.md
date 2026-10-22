# MeloQA sync — `portal-link-409-ctoken`

> Produto: **Portal do Cliente** (`portal`)  
> História Jira: **URG-10463** (Bug)  
> Issue **Cenários de Teste**: **URG-10863**  
> Issue **Teste**: **URG-10835**  
> Atualizado em: 2026-10-21

## Projeto MeloQA

| Campo | Valor |
|-------|-------|
| projectId | `ac035444-b3c9-42cd-8a5a-b6b00d684e53` |
| projectName | Talk |
| testCaseFolderId | `8bb2c83b-aff4-49af-bd11-616f0ad16c76` (Link Portal 409) |
| cycleFolderId | `8c434a0b-789b-47ee-bf5d-df4abb0e3f2c` (Talk (projeto Urgentes / Portal pipeline)) |
| bugFolderId | (pendente) |

## Publicação fase `cenarios`

| Campo | Valor |
|-------|-------|
| publicados MeloQA | 11 |
| specificationTime por CT | 3 min |
| duracao fase cenarios (min) | 31.9 |
| migradoMeloQA | sim (2026-10-21) |
| ciclo_oferecido_apos_cenarios | na-execucao |

## Casos publicados

| CT (Markdown) | meloqaId | URL | Status sync |
|---------------|----------|-----|-------------|
| CT-API-01 — Emitir link em paralelo com telefones diferentes devolve 200 e 409 com cToken | `a44d28a3-19d0-443a-8ebe-910e7cc1f08e` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=a44d28a3-19d0-443a-8ebe-910e7cc1f08e) | created |
| CT-API-02 — Emitir link em paralelo com o mesmo telefone devolve 200 nas duas requisições | `7bdb1886-62bb-454d-a411-47e7883e3be0` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=7bdb1886-62bb-454d-a411-47e7883e3be0) | created |
| CT-API-03 — Emitir link em sequência com telefones diferentes atualiza o telefone do link | `b00e9ac8-aabf-4898-8576-8984bdc2e73f` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=b00e9ac8-aabf-4898-8576-8984bdc2e73f) | created |
| CT-API-04 — Emitir link sem informar o celular retorna erro de validação | `2b263716-093c-4006-b4af-8a0b68c1785a` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=2b263716-093c-4006-b4af-8a0b68c1785a) | created |
| CT-API-05 — Emitir link com telefone inválido retorna 422 | `75a92e00-e756-42c2-b50e-ddb3a18e0b1e` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=75a92e00-e756-42c2-b50e-ddb3a18e0b1e) | created |
| CT-API-06 — Conflito sem link ativo retorna 409 sem oDados | `4acefccd-6d81-4474-b549-4271bf46f0e2` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=4acefccd-6d81-4474-b549-4271bf46f0e2) | created |
| CT-API-07 — Reemitir link com o mesmo telefone reaproveita o token sem alterar o contrato do 200 | `b9c28666-c89d-4108-82b9-991883ac66a3` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=b9c28666-c89d-4108-82b9-991883ac66a3) | created |
| CT-API-08 — Emitir link sem chave de API retorna 401 | `24ced1b3-4036-431d-8db8-5d2ee53aa011` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=24ced1b3-4036-431d-8db8-5d2ee53aa011) | created |
| CT-API-09 — Perdedor da corrida não altera o telefone do link ativo | `0324bf6a-94a6-40c9-9399-1147bd71b8de` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=0324bf6a-94a6-40c9-9399-1147bd71b8de) | created |
| CT-MAN-01 — Receber o link do Portal por WhatsApp (roteiro CT-1) | `5835a663-7e99-412d-95a7-870a883f2124` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=5835a663-7e99-412d-95a7-870a883f2124) | created |
| CT-MAN-02 — Bloquear acesso ao Portal com celular diferente (roteiro CT-3) | `43121eb0-86bb-4de7-9fff-0baa0d837b32` | [link](https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-case/8bb2c83b-aff4-49af-bd11-616f0ad16c76?type=small&id=43121eb0-86bb-4de7-9fff-0baa0d837b32) | created |

## Ciclo desta execução

| Campo | Valor |
|-------|-------|
| ciclo_oferecido_apos_cenarios | **na-execucao** |
| cycleId | `1d1230b2-c9bc-45f6-9e8b-f7d9341503fb` |
| cycleUrl | https://app.meloqa.com/core/project/ac035444-b3c9-42cd-8a5a-b6b00d684e53/test-cycle/8c434a0b-789b-47ee-bf5d-df4abb0e3f2c?type=small&id=1d1230b2-c9bc-45f6-9e8b-f7d9341503fb |
| statusCiclo (MeloQA) | Em progresso |
| Issue Teste (Jira) | URG-10835 |
| cycleName | `URG-10463 | Ciclo 1 | Link Portal 409 cToken` |
| assignedTo | Erick Felipe Prestes de Oliveira <erickfelipe@certtus.com.br> |
| plataforma | Nuvem |
| executions | 11 |
