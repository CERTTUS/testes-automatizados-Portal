/**
 * Organiza runs antigas: arquiva em historico/ com nome curto ou remove vazias.
 * A execução ativa passa a usar sempre runs/atual/.
 *
 *   npm run pre-cr:renomear-runs
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  RUN_ATUAL,
  converterRunIdParaCurto,
  ehRunIdLegado,
  ehRunIdLongo,
  garantirDir,
  parseArgs,
  repoRoot,
} from './lib/paths.mjs'
import { flattenRunDir } from './lib/provas-run.mjs'

function ajuda() {
  console.log(`
Organiza pastas de run em evidencias-pr/.

  npm run pre-cr:renomear-runs [--dry-run]

  - Cria runs/atual/ (pasta única da execução)
  - Move runs antigas → runs/historico/<YYYY-MM-DD_HH-mm>
  - Unifica provas na raiz da run (sem subpastas)
  - Remove pastas dev-* já migradas
`)
}

function temConteudoUtil(dir) {
  if (!fs.existsSync(dir)) return false
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) return true
    if (entry.isDirectory() && !['historico'].includes(entry.name)) {
      if (temConteudoUtil(path.join(dir, entry.name))) return true
    }
  }
  return false
}

function unificarTodasRuns(pastaDev, dryRun) {
  const runsDir = path.join(pastaDev, 'runs')
  if (!fs.existsSync(runsDir)) return 0

  let total = 0
  const atual = path.join(runsDir, RUN_ATUAL)
  if (!dryRun && fs.existsSync(atual)) total += flattenRunDir(atual)

  const historico = path.join(runsDir, 'historico')
  if (fs.existsSync(historico)) {
    for (const entry of fs.readdirSync(historico, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (!dryRun) total += flattenRunDir(path.join(historico, entry.name))
    }
  }

  return total
}

function destinoSemColisao(pasta, nome) {
  let destino = path.join(pasta, nome)
  if (!fs.existsSync(destino)) return destino
  let i = 2
  while (fs.existsSync(destino)) {
    destino = path.join(pasta, `${nome}__${i}`)
    i += 1
  }
  return destino
}

function organizarRunsDev(pastaDev, dryRun) {
  const alteracoes = []
  const runsDir = path.join(pastaDev, 'runs')
  if (!fs.existsSync(runsDir)) return alteracoes

  const historicoDir = garantirDir(path.join(runsDir, 'historico'))
  garantirDir(path.join(runsDir, RUN_ATUAL))

  for (const entry of fs.readdirSync(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === RUN_ATUAL || entry.name === 'historico') continue

    const origem = path.join(runsDir, entry.name)
    if (!ehRunIdLegado(entry.name) && !ehRunIdLongo(entry.name)) continue

    if (!temConteudoUtil(origem)) {
      alteracoes.push({ de: origem, para: null, acao: 'remover-vazia' })
      if (!dryRun) fs.rmSync(origem, { recursive: true, force: true })
      continue
    }

    const nomeCurto = converterRunIdParaCurto(entry.name)
    const destino = destinoSemColisao(historicoDir, nomeCurto)
    alteracoes.push({ de: origem, para: destino, acao: 'arquivar' })
    if (!dryRun) fs.renameSync(origem, destino)
  }

  return alteracoes
}

function removerDevVazias(root, dryRun) {
  const base = path.join(root, 'evidencias-pr')
  if (!fs.existsSync(base)) return []
  const alteracoes = []
  for (const parent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!parent.isDirectory()) continue
    const devDir = path.join(base, parent.name)
    for (const child of fs.readdirSync(devDir, { withFileTypes: true })) {
      if (!child.isDirectory() || !child.name.startsWith('dev-')) continue
      const full = path.join(devDir, child.name)
      if (!temConteudoUtil(full)) {
        alteracoes.push({ de: full, acao: 'remover-dev-vazia' })
        if (!dryRun) fs.rmSync(full, { recursive: true, force: true })
      }
    }
  }
  return alteracoes
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  ajuda()
  process.exit(0)
}

const root = repoRoot()
const dryRun = args.dryRun === true || args['dry-run'] === true
const base = path.join(root, 'evidencias-pr')
const alteracoes = []

if (!fs.existsSync(base)) {
  console.log('[pre-cr] Nenhuma pasta evidencias-pr encontrada.')
  process.exit(0)
}

for (const parent of fs.readdirSync(base, { withFileTypes: true })) {
  if (!parent.isDirectory()) continue
  const parentDir = path.join(base, parent.name)
  for (const child of fs.readdirSync(parentDir, { withFileTypes: true })) {
    if (!child.isDirectory()) continue
    const devDir = path.join(parentDir, child.name)
    alteracoes.push(...organizarRunsDev(devDir, dryRun))
  }
}

alteracoes.push(...removerDevVazias(root, dryRun))

let unificados = 0
if (!dryRun) {
  for (const parent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!parent.isDirectory()) continue
    const parentDir = path.join(base, parent.name)
    for (const child of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue
      unificados += unificarTodasRuns(path.join(parentDir, child.name), dryRun)
    }
  }
}

if (alteracoes.length === 0 && unificados === 0) {
  console.log('[pre-cr] Estrutura já organizada (runs/atual plana).')
  process.exit(0)
}

console.log(`[pre-cr] ${dryRun ? 'Simulação' : 'Organização'}:`)
for (const item of alteracoes) {
  if (item.acao === 'remover-vazia' || item.acao === 'remover-dev-vazia') {
    console.log(`  remover: ${path.relative(root, item.de)}`)
  } else {
    console.log(`  ${path.relative(root, item.de)}`)
    console.log(`    → ${path.relative(root, item.para)}`)
  }
}

if (unificados > 0) {
  console.log(`[pre-cr] ${unificados} arquivo(s) unificado(s) na raiz das runs`)
}
console.log(`[pre-cr] Concluído — ${alteracoes.length} ação(ões)`)
