/**
 * Gera markdown do body da PR QA_PRE_CR (modo testes — criar-pr).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  formatTimestamp,
  parseArgs,
  repoRoot,
  resolverPastaEvidencias,
  resolverUltimaRun,
} from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))
const produto = catalogo.produto || 'web'

function lerArquivoSeExistir(caminho) {
  return fs.existsSync(caminho) ? fs.readFileSync(caminho, 'utf8') : ''
}

function extrairVeredito(runDir) {
  const texto = lerArquivoSeExistir(path.join(runDir, 'resultado-execucao-dev.md'))
  if (texto.includes('PASSOU')) return 'PASSOU'
  if (texto.includes('REPROVOU') || texto.includes('FALHOU')) return 'FALHOU'
  return 'DESCONHECIDO'
}

function extrairCampoMeta(meta, campo) {
  const re = new RegExp(`\\*\\*${campo}:\\*\\*\\s*(.+)$`, 'm')
  const m = meta.match(re)
  return m ? m[1].trim() : ''
}

function gitDiffStat(root) {
  const bases = ['origin/main', 'origin/develop', 'main', 'develop']
  for (const base of bases) {
    const check = spawnSync('git', ['rev-parse', '--verify', base], {
      cwd: root,
      encoding: 'utf8',
    })
    if (check.status !== 0) continue
    const diff = spawnSync('git', ['diff', '--stat', `${base}...HEAD`], {
      cwd: root,
      encoding: 'utf8',
    })
    if (diff.status === 0 && diff.stdout.trim()) {
      return { base, stat: diff.stdout.trim() }
    }
  }
  const local = spawnSync('git', ['diff', '--stat', 'HEAD'], { cwd: root, encoding: 'utf8' })
  return { base: 'working tree', stat: local.stdout?.trim() || '(sem diff)' }
}

function listarSpecsAlterados(root, diffStat) {
  const linhas = diffStat.split('\n').filter((l) => /\.(ts|tsx|js|mjs|md)$/.test(l))
  return linhas
    .map((l) => l.trim().split('|')[0]?.trim())
    .filter(Boolean)
    .slice(0, 25)
}

function tabelaCtsDeCenarios(cenariosMd) {
  const linhas = []
  for (const linha of cenariosMd.split('\n')) {
    const m = linha.match(/^\|\s*(CT-[A-Z0-9-]+)\s*\|/)
    if (m) {
      const cols = linha.split('|').map((c) => c.trim()).filter(Boolean)
      if (cols.length >= 2 && cols[0] !== 'CT') {
        const secao = cols[1] ?? '—'
        if (/manual|e2e/i.test(secao)) continue
        const trilha = /smoke/i.test(secao) ? 'smoke' : 'api'
        linhas.push(`| ${cols[0]} | ${secao} | ${trilha} | *(preencher)* | |`)
      }
    }
  }
  return linhas.length
    ? linhas.join('\n')
    : '| — | — | — | *(preencher após execução)* | |'
}

const args = parseArgs(process.argv.slice(2))
if (!args.modulo || !args.devKey) {
  console.error('Uso: gerar-corpo-pr.mjs --modulo <slug> --dev-key <ISSUE> [--parent-key <PAI>]')
  process.exit(1)
}

const modulo = catalogo.modulos.find((m) => m.slug === args.modulo)
if (!modulo) {
  console.error(`Modulo desconhecido: ${args.modulo}`)
  process.exit(2)
}

const root = repoRoot()
const parentKey = args.parentKey || args.devKey
const pastaBase = resolverPastaEvidencias({ devKey: args.devKey, parentKey, root })
const runDir = resolverUltimaRun(pastaBase)
const meta = runDir ? lerArquivoSeExistir(path.join(runDir, 'meta.md')) : ''
const veredito = runDir ? extrairVeredito(runDir) : 'NAO_EXECUTADO'
const npmScript = extrairCampoMeta(meta, 'npm') || 'test:pre-cr'
const docsDir = path.join(root, modulo.docs)
const cenariosMd = lerArquivoSeExistir(path.join(docsDir, 'cenarios.md'))
const { base, stat } = gitDiffStat(root)
const specs = listarSpecsAlterados(root, stat)
const ambiente = process.env.E2E_AMBIENTE === 'test-server' ? 'test-server' : 'local'

const dataExec = runDir
  ? fs.statSync(runDir).mtime.toISOString().slice(0, 16).replace('T', ' ')
  : '—'

const body = `## 🧪 QA_PRE_CR — ${parentKey}: ${modulo.slug}

| Campo | Valor |
|-------|--------|
| **devKey** | ${args.devKey} |
| **parentKey** | ${parentKey} |
| **Produto** | ${produto} |
| **Módulo** | \`${modulo.slug}\` |
| **Veredito** | **${veredito}** |
| **Ambiente** | ${ambiente} |
| **Data execução** | ${dataExec} |
| **Comando** | \`npm run ${npmScript} -- --modulo ${modulo.slug} --dev-key ${args.devKey}\` |

---

### 📚 Contexto

Automação QA_PRE_CR do hop Dev — cobertura pontual do módulo **${modulo.label}** vinculada a \`${parentKey}\`.

**PR produto relacionada:** *(preencher org/repo#n após §7b)*

---

### 🛠️ O que entrou nesta PR (automação)

**Diff (vs \`${base}\`):**

\`\`\`text
${stat}
\`\`\`

**Arquivos principais:**
${specs.length ? specs.map((s) => `- \`${s}\``).join('\n') : '- *(nenhum arquivo de teste no diff — só docs ou execução sem commit)*'}

---

### ▶️ Execução

${runDir ? 'Última run empacotada no zip (não versionar paths locais).' : '*(sem run — rodar test:pre-cr antes da PR)*'}

**Comando canônico:**

\`\`\`bash
npm run test:pre-cr -- --modulo ${modulo.slug} --dev-key ${args.devKey}${args.parentKey ? ` --parent-key ${args.parentKey}` : ''}
\`\`\`

---

### Resultados (hop Dev)

| Camada | Valor |
|--------|-------|
| Jest | ${veredito === 'PASSOU' ? 'executado' : veredito} |
| API | ${veredito === 'PASSOU' ? 'executado' : veredito} |
| Smoke | ${veredito === 'PASSOU' ? 'executado' : veredito} |

### 📋 CTs executados (API + Smoke)

| CT | Seção | Trilha | Status | Nota |
|----|-------|--------|--------|------|
${tabelaCtsDeCenarios(cenariosMd)}

E2E e checklist manual: WU Teste.

---

### Evidência zip (baixar)

*(URL HTTPS injetada por gh-pr-dual-qa-pre-cr.py --zip-path)*

**Anexo Jira:** issue \`${args.devKey}\` (close-out Dev)

---

### 📝 Checklist

- [ ] Veredito coerente com a execução
- [ ] Tabela CTs com status real (✓ / ✗ / —)
- [ ] Link HTTPS do zip no body (não path local)
- [ ] Link PR produto na seção Contexto
- [ ] Reviewer = Auditor do pai Jira

---

### 🔗 Relacionado

- Jira Dev: https://certtus-team.atlassian.net/browse/${args.devKey}
- Jira pai: https://certtus-team.atlassian.net/browse/${parentKey}
- PR produto: *(preencher após §7b)*

<!-- HARNESS_QA_PRE_CR:${args.devKey} -->
Veredito: ${veredito} | Módulo: ${modulo.slug} | PR testes: #___
<!-- HARNESS_QA_PRE_CR_END:${args.devKey} -->
`

const outPath = args.output
  ? path.resolve(args.output)
  : path.join(pastaBase, `corpo-pr-${formatTimestamp()}.md`)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, body, 'utf8')

if (args.stdout !== '0') {
  console.log(body)
}
console.error(`[pre-cr] Corpo PR gravado: ${outPath}`)
