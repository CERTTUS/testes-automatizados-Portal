# evidencias-pr

Artefatos locais do hop Dev (QA_PRE_CR). Gitignored, exceto README e zips versionados na PR.

## Layout

```text
evidencias-pr/
  <parentKey>/
    <devKey>/
      runs/
        atual/
      zips/
```

## Comandos

```bash
npm run test:pre-cr -- --modulo <slug> --dev-key <DEV> --parent-key <HU>
npm run pre-cr:empacotar -- --modulo <slug> --dev-key <DEV> --parent-key <HU>
```
