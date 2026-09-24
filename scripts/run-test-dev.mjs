/**
 * Atalho QA_PRE_CR no repo de testes — resolve HARNESS_HOME e chama qa-test-dev.py.
 *
 *   npm run test:dev -- --dev-key TALK-1234 --parent-key TALK-1200 --repo ../talk-api
 *
 * Override produto: HARNESS_QA_REPO_PRODUTO ou --repo na linha de comando.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoTestes = path.resolve(__dirname, '..')

function lerEnvCursor(arquivo) {
  if (!fs.existsSync(arquivo)) return {}
  const out = {}
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
    if (k && v) out[k] = v
  }
  return out
}

function resolveHarnessHome() {
  if (process.env.HARNESS_HOME?.trim()) return process.env.HARNESS_HOME.trim()
  const home = process.env.USERPROFILE || process.env.HOME || ''
  for (const f of [
    path.join(process.cwd(), '.env-cursor'),
    path.join(repoTestes, '.env-cursor'),
    path.join(home, 'Documents', 'Cursor', '.env-cursor'),
  ]) {
    const v = lerEnvCursor(f).HARNESS_HOME
    if (v) return v
  }
  for (const d of [
    path.join(home, 'Documents', 'GitHub CERTTUS', 'Cursor'),
    path.join(home, 'Documents', 'Cursor'),
  ]) {
    if (fs.existsSync(path.join(d, '.cursor', 'scripts', 'qa-test-dev.py'))) return d
  }
  return null
}

const harnessHome = resolveHarnessHome()
const script = harnessHome && path.join(harnessHome, '.cursor', 'scripts', 'qa-test-dev.py')
if (!harnessHome || !fs.existsSync(script)) {
  console.error('[test:dev] Não achei HARNESS_HOME (.cursor/scripts/qa-test-dev.py).')
  console.error('[test:dev] Defina HARNESS_HOME ou .env-cursor na raiz do Cursor.')
  process.exit(2)
}

const extra = process.argv.slice(2)
const hasRepo = extra.some((a, i) => a === '--repo' || a.startsWith('--repo='))
const repoEnv = process.env.HARNESS_QA_REPO_PRODUTO?.trim()
const fwd = hasRepo || !repoEnv ? extra : ['--repo', repoEnv, ...extra]

const launcher = process.platform === 'win32' ? ['py', '-3'] : ['python3']
const resultado = spawnSync(launcher[0], [...launcher.slice(1), script, ...fwd], {
  cwd: repoTestes,
  stdio: 'inherit',
  shell: false,
})

if (resultado.error?.code === 'ENOENT') {
  console.error(`[test:dev] Python não encontrado (${launcher.join(' ')}).`)
  process.exit(2)
}

process.exit(resultado.status === null ? 1 : resultado.status)
