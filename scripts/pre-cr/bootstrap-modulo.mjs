/**
 * Cria entrada mínima no catálogo + pasta docs — o Dev não edita JSON.
 *
 *   node scripts/pre-cr/bootstrap-modulo.mjs --from-diff --parent-key IN-123 --dev-key IN-456
 *   node scripts/pre-cr/bootstrap-modulo.mjs --slug universidade --label "Universidade" --specs tests/e2e/specs/universidade/foo.spec.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseArgs, repoRoot } from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogoPath = path.join(__dirname, 'catalogo-modulos.json')

function arquivosDiff(root) {
  const nomes = []
  const r = spawnSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' })
  if (r.stdout) nomes.push(...r.stdout.split('\n').map((s) => s.trim()).filter(Boolean))
  return nomes.map((n) => n.replace(/\\/g, '/'))
}

function slugificar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function specsDoDiff(arquivos) {
  return arquivos.filter((f) => /\.(spec|test)\.(ts|js)$/.test(f) && (f.includes('tests/') || f.includes('test/')))
}

function areaDoDiff(arquivos) {
  for (const f of arquivos) {
    const m =
      f.match(/tests\/e2e\/specs\/([^/]+)/i) ||
      f.match(/tests\/e2e\/([^/]+)/i) ||
      f.match(/pages\/([^/]+)/i) ||
      f.match(/src\/pages\/([^/]+)/i) ||
      f.match(/src\/features\/([^/]+)/i)
    if (m) return slugificar(m[1])
  }
  return 'modulo'
}

const args = parseArgs(process.argv.slice(2))
const root = repoRoot()
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'))
const extraArquivos = (args.arquivos || '').split(',').map((s) => s.trim()).filter(Boolean)
const arquivos = [...arquivosDiff(root), ...extraArquivos]

let slug = args.modulo || args.slug
if (!slug && args.fromDiff !== undefined) {
  const area = areaDoDiff(arquivos)
  const chave = String(args.parentKey || args.devKey || 'auto').toLowerCase()
  slug = `${area}-${chave}`
}
if (!slug) {
  console.error('Informe --slug ou --from-diff --parent-key')
  process.exit(1)
}

if (catalogo.modulos.some((m) => m.slug === slug)) {
  console.log(JSON.stringify({ ok: true, slug, jaExistia: true }))
  process.exit(0)
}

const specsArg = (args.specs || '').split(',').map((s) => s.trim()).filter(Boolean)
const specs = specsArg.length ? specsArg : specsDoDiff(arquivos)
const docs = `docs/tests/${slug}`
const label = args.label || `Gerado na Dev (${slug})`

catalogo.modulos.push({
  slug,
  label,
  docs,
  specs,
  geradoNaDev: true,
  match: [slug, ...(args.parentKey ? [args.parentKey] : [])],
})

fs.writeFileSync(catalogoPath, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf8')

const docsAbs = path.join(root, docs)
fs.mkdirSync(docsAbs, { recursive: true })
if (!fs.existsSync(path.join(docsAbs, 'cenarios.md'))) {
  fs.writeFileSync(
    path.join(docsAbs, 'cenarios.md'),
    `# Cenários — ${label}\n\n> Gerado na Dev. Completar via qa-gerador-cenarios.\n\n## 1. API\n\n## 2. Smoke automatizado\n\n## 3. E2E — Caminho feliz\n\n[GAP]\n\n## 4. E2E — Caminho negativo\n\n[GAP]\n\n## 5. Manual (somente UI)\n`,
    'utf8',
  )
}

console.log(JSON.stringify({ ok: true, slug, docs, specs, geradoNaDev: true }, null, 2))
