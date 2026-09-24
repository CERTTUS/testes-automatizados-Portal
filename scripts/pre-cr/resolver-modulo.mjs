/**
 * Resolve o slug QA_PRE_CR pelo diff (repo testes e/ou arquivos de produto).
 * O Dev não escolhe módulo.
 *
 *   node scripts/pre-cr/resolver-modulo.mjs --json
 *   node scripts/pre-cr/resolver-modulo.mjs --json --arquivos "src/pages/Login.tsx,src/features/universidade/..."
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseArgs, repoRoot } from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))

function gitArquivos(root) {
  const nomes = new Set()
  const bases = ['origin/develop', 'origin/main', 'develop', 'main']
  for (const base of bases) {
    const ok = spawnSync('git', ['rev-parse', '--verify', base], { cwd: root, encoding: 'utf8' })
    if (ok.status !== 0) continue
    const diff = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8' })
    if (diff.status === 0 && diff.stdout.trim()) {
      for (const l of diff.stdout.split('\n')) {
        if (l.trim()) nomes.add(l.trim().replace(/\\/g, '/'))
      }
      break
    }
  }
  for (const args of [['diff', '--name-only'], ['diff', '--name-only', '--cached']]) {
    const extra = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
    if (extra.status === 0) {
      for (const l of extra.stdout.split('\n')) {
        if (l.trim()) nomes.add(l.trim().replace(/\\/g, '/'))
      }
    }
  }
  return [...nomes]
}

function tokensModulo(mod) {
  const bits = new Set()
  for (const campo of ['slug', 'label', 'pastaE2e', 'pastaApi', 'pastaSpecs', 'docs']) {
    const v = mod[campo]
    if (!v) continue
    for (const p of String(v).split(/[/\\_\s—,-]+/)) {
      const t = p.toLowerCase()
      if (t.length >= 3) bits.add(t)
    }
  }
  for (const m of mod.match ?? []) bits.add(String(m).toLowerCase())
  return [...bits]
}

function pontuar(mod, arquivos) {
  const toks = tokensModulo(mod)
  let pontos = 0
  const hay = arquivos.join(' ').toLowerCase().replace(/\\/g, '/')
  for (const pasta of [mod.pastaE2e, mod.pastaApi, mod.pastaSpecs, mod.docs]) {
    if (pasta && hay.includes(String(pasta).replace(/\\/g, '/').toLowerCase())) pontos += 4
  }
  for (const spec of mod.specs ?? []) {
    if (hay.includes(String(spec).replace(/\\/g, '/').toLowerCase())) pontos += 5
  }
  for (const m of mod.match ?? []) {
    const t = String(m).toLowerCase()
    if (t.length >= 4 && hay.includes(t)) pontos += 3
  }
  for (const t of toks) {
    if (t.length < 4) continue
    if (hay.includes(t)) pontos += 1
  }
  return pontos
}

const args = parseArgs(process.argv.slice(2))
const root = repoRoot()
const extra = (args.arquivos || args._.join(',') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const gitFiles = gitArquivos(root).filter(
  (f) => /tests?\//.test(f) || f.includes('docs/tests') || f.includes('scripts/pre-cr'),
)
const arquivos = extra.length ? extra : gitFiles

const ranked = catalogo.modulos
  .map((m) => ({ slug: m.slug, label: m.label, pontos: pontuar(m, arquivos) }))
  .sort((a, b) => b.pontos - a.pontos)

const melhor = ranked[0]
const segundo = ranked[1]
const ambiguo = melhor && segundo && melhor.pontos === segundo.pontos && melhor.pontos > 0
const ok = Boolean(melhor && melhor.pontos >= 2 && !ambiguo)

const payload = {
  ok,
  precisaBootstrap: !ok,
  slug: ok ? melhor.slug : null,
  label: ok ? melhor.label : null,
  pontos: melhor?.pontos ?? 0,
  candidatos: ranked.filter((r) => r.pontos > 0).slice(0, 5),
  arquivos: arquivos.slice(0, 40),
}

if (args.json || args.stdout === '1') {
  console.log(JSON.stringify(payload, null, 2))
} else if (ok) {
  console.log(melhor.slug)
} else {
  console.error('[pre-cr] Nenhum módulo claro no diff — rode bootstrap-modulo.mjs --from-diff')
  console.log(JSON.stringify(payload, null, 2))
  process.exit(2)
}
