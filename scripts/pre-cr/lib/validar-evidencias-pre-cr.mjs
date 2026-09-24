import fs from 'node:fs'
import path from 'node:path'

const EXT_PROVA = ['.png', '.json', '.xml', '.webm', '.zip']

function listarArquivos(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listarArquivos(full, acc)
    else acc.push(full)
  }
  return acc
}

function pastaPrintsCt(runDir, ctId) {
  return path.join(runDir, 'smoke', 'prints', ctId.toUpperCase())
}

function pastaVideosCt(runDir, ctId) {
  return path.join(runDir, 'smoke', 'videos', ctId.toUpperCase())
}

function validarSmk(runDir, ctId) {
  const id = ctId.toUpperCase()
  const pasta = pastaPrintsCt(runDir, id)
  if (!fs.existsSync(pasta)) {
    return `falta pasta smoke/prints/${id}/`
  }
  const pngs = fs.readdirSync(pasta).filter((f) => f.toLowerCase().endsWith('.png'))
  if (pngs.length < 2) {
    return `smoke/prints/${id}/ exige ≥2 PNG (encontrados: ${pngs.length})`
  }
  const intermediarios = pngs.filter((p) => p !== '99-tela-final.png')
  if (intermediarios.length < 1) {
    return `smoke/prints/${id}/ proibido só 99-tela-final.png`
  }
  const prefixados = pngs.filter((p) => /^\d{2}-.+\.png$/i.test(p) || p === '99-tela-final.png')
  if (prefixados.length < 2) {
    return `smoke/prints/${id}/ exige PNG prefixados 01-, 02-… e 99-tela-final`
  }
  const ciclo = path.join(pastaVideosCt(runDir, id), 'ciclo.webm')
  if (!fs.existsSync(ciclo)) {
    return `falta smoke/videos/${id}/ciclo.webm`
  }
  return null
}

function validarApi(runDir, ctId) {
  const id = ctId.toUpperCase()
  const json = path.join(runDir, 'api', `${id}-response.json`)
  const md = path.join(runDir, 'api', `${id}-resumo.md`)
  if (!fs.existsSync(json)) return `falta api/${id}-response.json`
  if (!fs.existsSync(md)) return `falta api/${id}-resumo.md`
  return null
}

function encontrarProvaJest(runDir, ctId) {
  const prefixo = ctId.toUpperCase()
  if (!prefixo.startsWith('CT-UNIT') && !prefixo.startsWith('CT-JEST') && !prefixo.startsWith('CEN-UNIT')) {
    return null
  }
  for (const nome of ['junit.xml', 'resultado.json', 'resultado-validacao.json', 'run.log']) {
    const p = path.join(runDir, 'jest', nome)
    if (fs.existsSync(p)) return `jest/${nome}`
  }
  return null
}

/**
 * @param {string} runDir
 * @returns {Array<{ id: string, status: string }>}
 */
export function extrairCtsDoResultado(runDir) {
  const arquivo = path.join(runDir, 'resultado-execucao-dev.md')
  if (!fs.existsSync(arquivo)) return []

  const texto = fs.readFileSync(arquivo, 'utf8')
  const cts = []
  for (const linha of texto.split('\n')) {
    const match = linha.match(
      /^\|\s*((?:CT|CEN)-[A-Z0-9-]+)\s*\|\s*[^|]+\s*\|\s*([^|]+)\s*\|/i,
    )
    if (!match) continue
    const status = match[2].trim().toUpperCase()
    if (status === 'PASSOU' || status === 'PASSED') {
      cts.push({ id: match[1].toUpperCase(), status: 'PASSOU' })
    }
  }
  return cts
}

/** @param {string} runDir */
export function extrairCtsPassou(runDir) {
  return extrairCtsDoResultado(runDir).map((ct) => ct.id)
}

/**
 * Valida LEIA-ME gerado no staging.
 * @param {string} stagingDir
 */
export function validarLeiaMe(stagingDir) {
  const arquivo = path.join(stagingDir, 'LEIA-ME.md')
  if (!fs.existsSync(arquivo)) {
    return 'falta LEIA-ME.md no staging'
  }
  const texto = fs.readFileSync(arquivo, 'utf8')
  if (!texto.includes('smoke/prints/') && !texto.includes('## API')) {
    return 'LEIA-ME.md sem sequência por CT'
  }
  const printsRoot = path.join(stagingDir, 'smoke', 'prints')
  if (fs.existsSync(printsRoot)) {
    for (const ct of fs.readdirSync(printsRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      if (!texto.includes(ct.name)) {
        return `LEIA-ME.md não lista CT ${ct.name}`
      }
    }
  }
  return null
}

/**
 * Valida evidências mínimas por CT (PASS exige prova).
 * @param {string} runDir
 * @param {{ cts?: Array<{ id: string, status?: string }> }} opts
 * @returns {{ ok: boolean, faltando: Array<{ ct: string, motivo: string }> }}
 */
export function validarEvidenciasPreCr(runDir, opts = {}) {
  const faltando = []
  const cts = opts.cts ?? extrairCtsDoResultado(runDir)

  for (const ct of cts) {
    if (ct.status && ct.status !== 'PASSOU' && ct.status !== 'passed') continue
    const id = ct.id.toUpperCase()
    if (id.includes('E2E') && !id.includes('SMK')) continue

    if (id.includes('SMK')) {
      const motivo = validarSmk(runDir, id)
      if (motivo) faltando.push({ ct: ct.id, motivo })
      continue
    }

    if (id.includes('API') || id.startsWith('CEN-API')) {
      const motivo = validarApi(runDir, id)
      if (motivo) faltando.push({ ct: ct.id, motivo })
      continue
    }

    if (!encontrarProvaJest(runDir, ct.id)) {
      const todos = [
        ...listarArquivos(path.join(runDir, 'evidencias')),
        ...listarArquivos(path.join(runDir, 'api')),
        ...listarArquivos(path.join(runDir, 'jest')),
      ]
      const prefixo = id
      const achou = todos.some((arquivo) => {
        const base = path.basename(arquivo)
        return base.toUpperCase().includes(prefixo) && EXT_PROVA.some((ext) => base.toLowerCase().endsWith(ext))
      })
      if (!achou) {
        faltando.push({
          ct: ct.id,
          motivo: 'PASSOU sem screenshot, JSON, vídeo ou log rastreável',
        })
      }
    }
  }

  if (cts.length === 0) {
    const temAlgumArtefato =
      listarArquivos(path.join(runDir, 'smoke')).length > 0 ||
      listarArquivos(path.join(runDir, 'api')).length > 0 ||
      listarArquivos(path.join(runDir, 'jest')).length > 0 ||
      listarArquivos(path.join(runDir, 'evidencias')).length > 0
    if (!temAlgumArtefato) {
      faltando.push({ ct: '(geral)', motivo: 'run sem artefatos smoke/api/jest' })
    }
  }

  return { ok: faltando.length === 0, faltando }
}
