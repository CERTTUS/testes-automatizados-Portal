# Cobertura diff — portal-link-409-ctoken

> Teste: URG-10835 | HU: URG-10463 (Bug) | Dev: URG-10710 | `modoPipeline: completo` (WU TESTES)
> Base: `contexto-pr.md` + `cenarios.md` + `escopo.md` + `git diff d9b0224..HEAD` (branch `urgente/URG-10463`, repo `api-microservicos`)

## Resumo

| Métrica | Valor |
|---------|-------|
| Alterações de produção mapeadas | 3 (+ 3 arquivos de teste Jest) |
| Cobertas (feliz + negativo) | 3 |
| Parcial | 0 |
| Sem cenário | 0 |
| Jest pendente | 0 |
| Divergências documentais | 1 (CT-API-04: 400 x 422) |

**Conclusão:** `ok-para-automatizar` (com ajuste documental em `escopo.md`, ver Alertas; execução bloqueada por massa, ver `massa-local.md`)

---

## Matriz arquivo × cenário

| Alteração (arquivo / endpoint) | Comportamento | CT feliz | CT negativo | Jest | API | Smoke | Status |
|--------------------------------|---------------|----------|-------------|------|-----|-------|--------|
| `src/controllers/Servico/PortalLinkEmitirController.ts` — POST `/servicos/portal/link`: 409 com `oDados{cToken,lHashAtualizado:false}` quando erro traz `cTokenAtivo`; 409 sem `oDados` caso contrário | 409 da corrida devolve o token do link ativo | CT-API-01 (principal), CT-API-02, CT-API-09 | CT-API-06 (409 sem `oDados`, só Jest), CT-API-04, CT-API-05, CT-API-08 | `PortalLinkEmitirController.test.ts` (5) | ✓ | — | coberto |
| `src/services/PortalClienteLinkServico.ts` (`linkEmitir`, catch do insert): se há link ativo de outro telefone lança `OsLinkPublicoConflitoErro(msg, token)` | ramo novo da corrida; vizinhos do mesmo `catch` | CT-API-01, CT-API-02 (mesmo telefone), CT-API-03 (sequencial, `lHashAtualizado:true`), CT-API-07 (reemissão) | CT-API-06 (sem link ativo, relê e relança) | `PortalClienteLinkServico.test.ts` (ajuste: `toMatchObject({cTokenAtivo})`); `PortalLinkEmitir.corrida.integracao.test.ts` (3) | ✓ | — | coberto |
| `src/services/OsLinkPublicoRepositorio.ts` (`OsLinkPublicoConflitoErro.cTokenAtivo?`, 2º arg do construtor) | campo aditivo no erro; não é exposto diretamente em HTTP | CT-API-01 (via controller) | CT-API-06 (default sem token) | serviço + corrida + controller | ✓ (indireto) | — | coberto |
| Portal web/BFF — barreira de acesso por telefone (`/{token}` → `/os/{token}`); não alterado na PR | consome o token do link | CT-E2E-01 (fase positiva) | CT-E2E-01 (celular diferente → 403) | — | — | — | coberto (E2E) |

**Status:** `coberto` | `parcial` | `sem-cenario` | `pendente-irma:<devKey>`

Irmãs/tasks: PT sem outra Dev no diff; nenhum `pendente-irma`.

Observações da matriz:

- CT-API-06 é `[EXISTE]` (Jest) e não gera spec HTTP (token CSPRNG impede reproduzir conflito de token por HTTP). Cobertura do ramo negativo "409 sem link ativo" fica só no Jest do controller (ver Alertas).
- CT-API-09 cobre a regra "perdedor não altera o hash": no diff está implícita em `lHashAtualizado:false` e na ausência de `atualizarHash` no novo `throw`.
- CT-MAN-01 (CT-1, WhatsApp, URG-10711) cobre o consumidor, não o diff; segue manual. CT-3 virou **CT-E2E-01** (E2E Playwright, aprovado pelo humano): cobre a barreira do portal sobre o token devolvido no 409.

---

## Jest (repo produto)

| Arquivo fonte alterado | Teste (`*.test.ts`) | Feliz | Negativo | Status |
|------------------------|---------------------|-------|----------|--------|
| `PortalLinkEmitirController.ts` | `PortalLinkEmitirController.test.ts` | 200 com `oDados`; 409 com `cToken` | 409 sem `cTokenAtivo` (sem `oDados`); 400 body inválido; repasse de `PortalClienteHttpErro` (404) | coberto |
| `PortalClienteLinkServico.ts` | `PortalClienteLinkServico.test.ts` (+ corrida) | mesmo telefone reaproveita token; telefone diferente sequencial atualiza hash | conflito com link ativo lança `OsLinkPublicoConflitoErro` com `cTokenAtivo` | coberto |
| `OsLinkPublicoRepositorio.ts` | `PortalLinkEmitir.corrida.integracao.test.ts` (fake com UNIQUE 23505) | corrida mesmo telefone 200/200; sequencial 200 com hash atualizado | corrida com telefones diferentes: 200 + 409 com token | coberto |

Lacuna Jest: o ramo "conflito sem link ativo" no nível do **serviço** (relê e relança o erro original sem token) não aparece no diff de teste; é pré-existente (não alterado na PR), então não bloqueia.

---

## Alertas

- **Divergência 400 x 422 (CT-API-04)** — sinalizada, não bloqueante.
  - `escopo.md` (tabela "Incluir na execução", borda C; texto do gate; e `review-pre-cr.md` lacuna 2) diz **422** para "emissão sem celular".
  - `cenarios.md` CT-API-04 diz **400**; `massa-local.md` também.
  - Verificado no código (`PortalLinkEmitirController.ts` linhas 38-51): `cTelefone` é `Joi.string().trim().min(1).max(32).required()`; ausente ou vazio cai no Joi e responde **400** com `cMensagem` "cTelefone é obrigatório." / "cTelefone não pode ser vazio.". O 422 "Telefone é obrigatório" do serviço é inalcançável por HTTP. O 422 existe para telefone **inválido** (CT-API-05, `"123"`) e para empresa/Portal não elegível.
  - Conclusão: **`cenarios.md` (400) está correto**; `escopo.md` e `review-pre-cr.md` estão desatualizados. Ação sugerida: ajustar `escopo.md` (borda C: 422 para 400) e o texto do gate `escopo`; confirmar com o humano (decisão em aberto nº 3 de `massa-local.md`). Não reescrevi `escopo.md` (fora do escopo deste agente).
- Áreas sensíveis: o 409 expõe token de link registrado com **outro** telefone (permissão/segurança). Coberto por CT-API-01 (retorno do token) e CT-API-09 (hash do perdedor intocado); a proteção efetiva ("Acesso não autorizado") é CT-E2E-01 (P0, automacao-e2e). Sem lacuna de cenário; a barreira agora é automatizada.
- Alterado e sem cenário: nenhum.
- Bloqueio de execução (fora deste artefato): CT-API-01, 02, 03, 07 e 09 dependem de Portal habilitado na empresa 0001 e de `os_link_publico` acessível (Supabase placeholder). Ver `massa-local.md`. CT-API-04, 05 e 08 não criam link, mas sem a flag o CT-API-04/05 podem devolver outro status (422 de empresa não elegível no lugar do esperado para 05), então também dependem da habilitação.
- Versão no ar: a API local pode estar em outro branch (`urgente/TALK-2657`); sem a PR #22, CT-API-01 falha (serve de prova de detecção, mas não numa rodada de aceitação).

---

## Lacunas sugeridas

1. Ajustar `escopo.md` borda C: "Emissão sem celular: 422" para "400" (alinha com CT-API-04).
2. (Opcional, P2) CT-API-04b — `cTelefone` vazio (`""`) retorna 400 "cTelefone não pode ser vazio.": objetivo, cobrir o segundo ramo do Joi (`string.empty`) junto do ausente.
3. (Opcional, P2) Em CT-API-01, exigir também que o 409 não grave o telefone do perdedor (já coberto por CT-API-09; apenas garantir que CT-API-09 rode na mesma OS após a corrida).

Nenhuma lacuna obrigatória de cenário.

---

## Origem dos cenários

```yaml
origem: gerado-na-dev
cenariosIssueKey: null
ctImportados: 0
ctNovosDiff: 9   # CT-API-01..09 (CT-API-06 existe via Jest) + CT-E2E-01 + CT-MAN-01 (manual)
debitoProcesso: null
```
