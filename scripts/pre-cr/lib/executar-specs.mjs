import { spawnSync } from 'node:child_process'

function normalizar(p) {
  return String(p || '').replace(/\\/g, '/')
}

export function ehSpecApi(arquivo) {
  const n = `/${normalizar(arquivo).toLowerCase()}`.replace(/\/+/g, '/')
  return n.includes('/tests/api/') || n.includes('/test/api/')
}

export function ehSpecSmoke(arquivo) {
  const n = `/${normalizar(arquivo).toLowerCase()}`.replace(/\/+/g, '/')
  const base = n.split('/').pop() || ''
  if (n.includes('/tests/smoke/')) return true
  if (base.includes('jornada') || base.includes('completo')) return false
  return base.includes('smoke') || /(?:^|[-_/])smk[-_]/.test(base)
}

const CAMADAS_VALIDAS = new Set(['api', 'smoke'])

/** @param {string|boolean|undefined} raw @param {string[]} [padrao] */
export function parseCamadas(raw, padrao = ['api', 'smoke']) {
  if (raw == null || raw === true) return padrao
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => CAMADAS_VALIDAS.has(s))
  return parts.length ? parts : padrao
}

/** @param {string[]} specs @param {string[]} camadas */
export function filtrarSpecsPorCamadas(specs, camadas) {
  const set = new Set(camadas)
  return specs.filter((s) => {
    if (set.has('api') && ehSpecApi(s)) return true
    if (set.has('smoke') && ehSpecSmoke(s) && !ehSpecApi(s)) return true
    return false
  })
}

/**
 * Roda Playwright só nos specs do catálogo (módulo gerado, sem script npm).
 * @param {{ root: string, specs: string[], env: NodeJS.ProcessEnv, projects?: string[] }} opts
 * @returns {number}
 */
export function executarSpecsPlaywright({ root, specs, env, projects }) {
  if (!specs.length) return 2
  const lWindows = process.platform === 'win32'
  const cRunner = lWindows ? 'npx.cmd' : 'npx'
  const nomes = projects?.length ? projects : ['chromium']
  const projetos = nomes.flatMap((p) => ['--project', p])
  const mArgs = ['playwright', 'test', ...specs, ...projetos]
  const result = spawnSync(cRunner, mArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: lWindows,
    env,
  })
  if (result.error) {
    console.error('[pre-cr] Falha ao iniciar Playwright:', result.error.message)
    return 1
  }
  return result.status ?? 1
}
