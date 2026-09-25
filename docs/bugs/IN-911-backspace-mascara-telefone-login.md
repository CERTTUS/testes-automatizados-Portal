# Backspace não remove DDD mascarado no login Portal

> Versionar em `docs/bugs/IN-911-backspace-mascara-telefone-login.md` · repo **testes-automatizados-Portal**

| Campo | Valor |
|-------|--------|
| Produto | portal |
| parentKey | [IN-901](https://certtus-team.atlassian.net/browse/IN-901) |
| testeKey | [IN-911](https://certtus-team.atlassian.net/browse/IN-911) |
| Dev | [IN-907](https://certtus-team.atlassian.net/browse/IN-907) |
| bugKey | [IN-913](https://certtus-team.atlassian.net/browse/IN-913) |
| Módulo | `portal-login-telefone` |
| CT | CT-MAN-04 — Máscara BR progressiva enquanto digita |
| Origem | produto |

> **Origem obrigatória:** `produto`

| Data | 2026-09-24 |

## Breve introdução

Durante a execução manual dos CTs de máscara de telefone no login do Portal (história IN-901, teste IN-911), ao preencher o celular na landing pública com DDD `(11)`, o usuário não consegue corrigir o prefixo com Backspace: a máscara remonta `(11)` imediatamente, impedindo edição natural do DDD antes de concluir o login.

## Tela / fluxo

Landing pública `/{token}` → formulário **Acessar com telefone** (`FormularioAcessoTelefone` / `CampoTelefone`).

## Comportamento Atual

- **Contexto:** Landing local `http://localhost:3000/xK9mP2nQ4rS6tU8vW0yZ12` (mock E2E; mesmo componente do PR #27).
- **Ação:** Digitar `11999999999` → campo exibe `(11) 999999999`.
- **Edição:** Com cursor após `(11)`, pressionar **Backspace** sobre `)`, `(`, espaço ou DDD.
- **Defeito:** O trecho `(11)` **não é removido** de forma usável; a máscara se recompõe enquanto os dígitos `11` permanecem no valor.
- **Workaround:** Apagar dígito a dígito até o fim ou `Ctrl+A` + Delete.
- **Reprodução:** Manual local 2026-09-24 + CT-MAN-04.

## Comportamento Esperado

Conforme **CT-MAN-04** (máscara progressiva sem quebrar cursor):

- Backspace deve permitir **editar ou remover o DDD** e caracteres de máscara de forma previsível.
- O cursor não deve “prender” o usuário no prefixo `(DD)` ao corrigir o número.

## Evidência

- Reprodução manual confirmada em 2026-09-24 (token mock `xK9mP2nQ4rS6tU8vW0yZ12`).
- Causa provável: `telefoneFormatar` em todo `onChange` descarta não-dígitos e remonta máscara (`FormularioAcessoTelefone.tsx`, `telefoneFormatar.ts`).
- Prints: anexar na issue após criação.

## PRs desta entrega

- https://github.com/CERTTUS/portalcliente-web/pull/27

## Um comando para retestar

```bash
# Manual: abrir landing e exercitar Backspace no campo telefone
# http://localhost:3000/xK9mP2nQ4rS6tU8vW0yZ12
```
