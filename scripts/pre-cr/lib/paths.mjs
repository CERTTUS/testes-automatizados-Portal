import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Pasta única da execução em andamento (evita acumular dezenas de runs). */
export const RUN_ATUAL = 'atual'

const RE_RUN_ID_LEGADO = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/
const RE_RUN_ID_LONGO = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-\d{2}(?:-.+)?$/

/** Raiz do repositório de testes. */
export function repoRoot() {
  return path.resolve(__dirname, '../../..')
}

/** Timestamp curto para zip/arquivo: 2026-09-14_15-01 */
export function formatTimestampLegivel(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}`
  )
}

/** Alias — mesmo formato curto. */
export function formatTimestamp(date = new Date()) {
  return formatTimestampLegivel(date)
}

/** Nome curto para histórico (só ao arquivar): 2026-09-14_15-01 */
export function formatRunIdHistorico(date = new Date()) {
  return formatTimestampLegivel(date)
}

/** Pasta da execução atual — sempre runs/atual */
export function resolverRunDir(pastaBase) {
  return garantirDir(path.join(pastaBase, 'runs', RUN_ATUAL))
}

/** Limpa conteúdo da run antes de nova execução. */
export function limparRunDir(runDir) {
  if (!fs.existsSync(runDir)) return
  for (const entry of fs.readdirSync(runDir, { withFileTypes: true })) {
    const full = path.join(runDir, entry.name)
    fs.rmSync(full, { recursive: true, force: true })
  }
}

/** Formato antigo: 20260914-145236 */
export function ehRunIdLegado(nome) {
  return RE_RUN_ID_LEGADO.test(String(nome || '').trim())
}

/** Formato longo intermediário: 2026-09-14_14-52-36-descricao-sugestao */
export function ehRunIdLongo(nome) {
  const n = String(nome || '').trim()
  if (n === RUN_ATUAL || n === 'historico') return false
  return RE_RUN_ID_LONGO.test(n) || ehRunIdLegado(n)
}

/** Converte qualquer formato antigo → 2026-09-14_14-52 */
export function converterRunIdParaCurto(nomeAntigo) {
  const nome = String(nomeAntigo || '').trim()
  const legado = nome.match(RE_RUN_ID_LEGADO)
  if (legado) {
    const [, ano, mes, dia, hora, min] = legado
    return `${ano}-${mes}-${dia}_${hora}-${min}`
  }
  const longo = nome.match(RE_RUN_ID_LONGO)
  if (longo) {
    return `${longo[1]}_${longo[2]}-${longo[3]}`
  }
  return nome
}

/** @deprecated use converterRunIdParaCurto */
export function converterRunIdLegado(nomeLegado) {
  return converterRunIdParaCurto(nomeLegado)
}

/** Lê slug do módulo em meta.md da run (quando existir). */
export function lerModuloDaMeta(runDir) {
  const metaPath = path.join(runDir, 'meta.md')
  if (!fs.existsSync(metaPath)) return null
  const texto = fs.readFileSync(metaPath, 'utf8')
  const match = texto.match(/\*\*modulo:\*\*\s*([a-z0-9-]+)/i)
  return match ? match[1].toLowerCase() : null
}

/** Run em uso: preferir runs/atual; senão a mais recente em runs/historico ou runs/*. */
export function resolverUltimaRun(pastaBase) {
  const atual = path.join(pastaBase, 'runs', RUN_ATUAL)
  if (fs.existsSync(atual) && fs.readdirSync(atual).length > 0) {
    return atual
  }

  const runsDir = path.join(pastaBase, 'runs')
  if (!fs.existsSync(runsDir)) return null

  const runs = []
  for (const entry of fs.readdirSync(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === RUN_ATUAL) continue
    const caminho = path.join(runsDir, entry.name)
    runs.push({ caminho, mtime: fs.statSync(caminho).mtimeMs })
  }
  runs.sort((a, b) => a.mtime - b.mtime)
  return runs.length ? runs[runs.length - 1].caminho : null
}

/**
 * Pasta base de evidências — âncora HU + subtarefa Dev.
 * @param {{ devKey?: string, parentKey?: string, prNumber?: string|number, root?: string }} opts
 */
export function resolverPastaEvidencias({ devKey, parentKey, prNumber, root = repoRoot() }) {
  const base = path.join(root, 'evidencias-pr')
  if (prNumber) return path.join(base, `PR-${prNumber}`)
  if (parentKey && devKey) {
    return path.join(base, parentKey, devKey)
  }
  if (parentKey) {
    return path.join(base, parentKey)
  }
  if (devKey) return path.join(base, devKey)
  throw new Error('Informe --dev-key <ISSUE> (e --parent-key <HU> quando possível) ou --pr <número>')
}

export function resolverPastaZips(pastaBase) {
  return path.join(pastaBase, 'zips')
}

/** Último zip gerado em evidencias-pr/<parent>/<dev>/zips/. */
export function resolverUltimoZip(pastaBase) {
  const zipsDir = resolverPastaZips(pastaBase)
  if (!fs.existsSync(zipsDir)) return null
  const zips = fs
    .readdirSync(zipsDir)
    .filter((nome) => nome.endsWith('.zip'))
    .map((nome) => {
      const caminho = path.join(zipsDir, nome)
      return { nome, caminho, mtime: fs.statSync(caminho).mtimeMs }
    })
    .sort((a, b) => a.mtime - b.mtime)
  return zips.length ? zips[zips.length - 1] : null
}

export function garantirDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--modulo' || token === '-m') {
      args.modulo = argv[++i]
    } else if (token === '--dev-key' || token === '--issue') {
      args.devKey = argv[++i]
    } else if (token === '--pr') {
      args.prNumber = argv[++i]
    } else if (token === '--ambiente') {
      args.ambiente = argv[++i]
    } else if (token === '--parent-key') {
      args.parentKey = argv[++i]
    } else if (token === '--output' || token === '-o') {
      args.output = argv[++i]
    } else if (token === '--stdout') {
      args.stdout = argv[++i]
    } else if (token === '--help' || token === '-h') {
      args.help = true
    } else if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('-')) {
        args[key] = true
      } else {
        args[key] = argv[++i]
      }
    } else if (!token.startsWith('-')) {
      args._.push(token)
    }
  }
  return args
}
