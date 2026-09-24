/**
 * Inicializa pastas da rodada QA no início do ciclo (hop parcial ou completo).
 *
 *   node scripts/pre-cr/iniciar-rodada.mjs --parent-key IN-884 --dev-key IN-891 --modulo descricao-sugestao
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { garantirRodada } from './lib/rodada.mjs'
import { parseArgs, repoRoot } from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))

function ajuda() {
  console.log(`
Inicia pastas da rodada QA (docs + evidencias-pr).

  node scripts/pre-cr/iniciar-rodada.mjs --parent-key IN-884 --dev-key IN-891 [--modulo descricao-sugestao]

Layout:
  docs/tests/<parentKey>/          (status.md, harness-handoff.json, cenarios.md, …)
  evidencias-pr/<parentKey>/<devKey>/runs/atual/
`)
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  ajuda()
  process.exit(0)
}

if (!args.parentKey) {
  console.error('[pre-cr] BLOQUEADO: --parent-key <HU> obrigatório (ex.: IN-884)')
  ajuda()
  process.exit(1)
}

const root = repoRoot()
let modulo = null
if (args.modulo) {
  modulo = catalogo.modulos.find((m) => m.slug === args.modulo)
  if (!modulo) {
    console.error(`[pre-cr] Módulo desconhecido: ${args.modulo}`)
    process.exit(2)
  }
  if (!args.parentKey && modulo.parentKey) {
    args.parentKey = modulo.parentKey
  }
}

const parentKey = args.parentKey || modulo?.parentKey
const { docsDir, pastaEvidencias, handoffPath, statusPath } = garantirRodada({
  root,
  parentKey,
  devKey: args.devKey,
  testeKey: args.testeKey || args.devKey,
  modulo: modulo ?? args.modulo,
  produto: catalogo.produto || 'portal',
})

console.log('[pre-cr] Rodada iniciada')
console.log(`[pre-cr] parentKey: ${parentKey}`)
console.log(`[pre-cr] docs: ${path.relative(root, docsDir)}`)
console.log(`[pre-cr] evidencias: ${path.relative(root, pastaEvidencias)}`)
console.log(`[pre-cr] handoff: ${path.relative(root, handoffPath)}`)
console.log(`[pre-cr] status: ${path.relative(root, statusPath)}`)
