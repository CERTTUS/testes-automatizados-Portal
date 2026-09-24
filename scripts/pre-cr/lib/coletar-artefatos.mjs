import fs from 'node:fs'
import path from 'node:path'
import { garantirDir, repoRoot } from './paths.mjs'

function listarRecursivo(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listarRecursivo(full, acc)
    else acc.push(full)
  }
  return acc
}

function detectarCtEmNome(nome) {
  const m = String(nome).match(/\b((?:CT|CEN)-[A-Z0-9-]+)\b/i)
  return m ? m[1].toUpperCase() : null
}

function pastaPrintsCt(runDir, ctId) {
  return garantirDir(path.join(runDir, 'smoke', 'prints', ctId))
}

function pastaVideosCt(runDir, ctId) {
  return garantirDir(path.join(runDir, 'smoke', 'videos', ctId))
}

function pastaApi(runDir) {
  return garantirDir(path.join(runDir, 'api'))
}

function copiarSeNaoExiste(origem, destino, copiados, label) {
  if (!fs.existsSync(origem)) return
  if (fs.existsSync(destino)) return
  garantirDir(path.dirname(destino))
  fs.copyFileSync(origem, destino)
  copiados.push(label)
}

function idsCtComEvidenciaSmoke(runDir) {
  const ids = new Set()
  const printsRoot = path.join(runDir, 'smoke', 'prints')
  if (fs.existsSync(printsRoot)) {
    for (const entry of fs.readdirSync(printsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) ids.add(entry.name.toUpperCase())
    }
  }

  const legadoDirs = [path.join(runDir, 'evidencias', 'screenshots'), runDir]
  for (const dir of legadoDirs) {
    if (!fs.existsSync(dir)) continue
    for (const arquivo of listarRecursivo(dir)) {
      if (!arquivo.toLowerCase().endsWith('.png')) continue
      const ct = detectarCtEmNome(path.basename(arquivo))
      if (ct && ct.includes('SMK')) ids.add(ct)
    }
  }
  return ids
}

function migrarPngLegadoParaPastaCt(runDir, ctId, copiados) {
  const destDir = pastaPrintsCt(runDir, ctId)
  const candidatos = []

  for (const dir of [path.join(runDir, 'evidencias', 'screenshots'), runDir]) {
    if (!fs.existsSync(dir)) continue
    for (const arquivo of listarRecursivo(dir)) {
      if (!arquivo.toLowerCase().endsWith('.png')) continue
      const base = path.basename(arquivo)
      const ct = detectarCtEmNome(base)
      if (ct !== ctId) continue
      candidatos.push(arquivo)
    }
  }

  for (const arquivo of candidatos) {
    const base = path.basename(arquivo)
    let destNome = base
    const mFinal = base.match(/^((?:CT|CEN)-[A-Z0-9-]+)-tela-final\.png$/i)
    if (mFinal) destNome = '99-tela-final.png'
    const mPasso = base.match(/^\d{2}-.+\.png$/i)
    if (!mFinal && !mPasso) continue
    const dest = path.join(destDir, destNome)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(arquivo, dest)
      copiados.push(`smoke/prints/${ctId}/${destNome}`)
    }
  }
}

function lerManifestCts(runDir) {
  const manifestPath = path.join(runDir, 'manifest-cts.jsonl')
  if (!fs.existsSync(manifestPath)) return []
  const porCt = new Map()
  for (const linha of fs.readFileSync(manifestPath, 'utf8').split('\n')) {
    const texto = linha.trim()
    if (!texto) continue
    try {
      const entrada = JSON.parse(texto)
      if (entrada.ctId) porCt.set(entrada.ctId.toUpperCase(), { ...porCt.get(entrada.ctId), ...entrada })
    } catch {
      /* ignora */
    }
  }
  return [...porCt.values()]
}

function coletarVideosCiclo(runDir, root, idsSmk, copiados) {
  const testResults = path.join(root, 'test-results')
  const manifest = lerManifestCts(runDir)

  for (const ctId of idsSmk) {
    const destino = path.join(pastaVideosCt(runDir, ctId), 'ciclo.webm')
    if (fs.existsSync(destino)) {
      copiados.push(`smoke/videos/${ctId}/ciclo.webm`)
      continue
    }

    const entrada = manifest.find((m) => m.ctId?.toUpperCase() === ctId)
    if (entrada?.outputDir) {
      const pastaTeste = path.join(root, entrada.outputDir)
      copiarSeNaoExiste(
        path.join(pastaTeste, 'video.webm'),
        destino,
        copiados,
        `smoke/videos/${ctId}/ciclo.webm`,
      )
    }

    if (!fs.existsSync(destino)) {
      for (const arquivo of listarRecursivo(testResults)) {
        if (!arquivo.toLowerCase().endsWith('.webm')) continue
        if (!arquivo.toUpperCase().includes(ctId)) continue
        if (path.basename(arquivo).toLowerCase().includes('-pontual-')) continue
        copiarSeNaoExiste(arquivo, destino, copiados, `smoke/videos/${ctId}/ciclo.webm`)
        break
      }
    }
  }
}

function coletarVideosPontuais(runDir, idsSmk, copiados) {
  const origens = [path.join(runDir, 'evidencias', 'videos'), path.join(runDir, 'smoke', 'videos')]

  for (const ctId of idsSmk) {
    const destDir = pastaVideosCt(runDir, ctId)
    for (const origem of origens) {
      if (!fs.existsSync(origem)) continue
      for (const arquivo of listarRecursivo(origem)) {
        const base = path.basename(arquivo).toLowerCase()
        if (!base.endsWith('.webm')) continue
        if (!base.includes('pontual')) continue
        if (!arquivo.toUpperCase().includes(ctId)) continue
        const destNome = base.replace(/^ct-[a-z0-9-]+-/, '')
        const dest = path.join(destDir, destNome.startsWith('pontual-') ? destNome : `pontual-${destNome}`)
        copiarSeNaoExiste(arquivo, dest, copiados, `smoke/videos/${ctId}/${path.basename(dest)}`)
      }
    }
  }
}

function coletarApi(runDir, copiados) {
  const apiDir = pastaApi(runDir)
  const candidatos = []

  for (const dir of [path.join(runDir, 'evidencias', 'api'), runDir]) {
    if (!fs.existsSync(dir)) continue
    for (const arquivo of listarRecursivo(dir)) {
      const base = path.basename(arquivo)
      if (!/^(CT|CEN)-[A-Z0-9-]+-response\.json$/i.test(base)) continue
      candidatos.push(arquivo)
    }
  }

  for (const arquivo of candidatos) {
    const base = path.basename(arquivo)
    const ctId = base.replace(/-response\.json$/i, '').toUpperCase()
    const destJson = path.join(apiDir, `${ctId}-response.json`)
    copiarSeNaoExiste(arquivo, destJson, copiados, `api/${ctId}-response.json`)

    const destMd = path.join(apiDir, `${ctId}-resumo.md`)
    if (!fs.existsSync(destMd) && fs.existsSync(destJson)) {
      try {
        const payload = JSON.parse(fs.readFileSync(destJson, 'utf8'))
        const status = payload.status ?? payload.nStatus ?? '—'
        const url = payload.url ?? payload.cUrl ?? '—'
        const resumo = [
          `# ${ctId}`,
          '',
          `- **HTTP:** ${status}`,
          `- **URL:** ${url}`,
          `- **Prova:** resposta da API conforme cenário.`,
          '',
        ].join('\n')
        fs.writeFileSync(destMd, resumo, 'utf8')
        copiados.push(`api/${ctId}-resumo.md`)
      } catch {
        /* gerado no helper quando possível */
      }
    }
  }
}

/**
 * Organiza artefatos na run no layout canônico (smoke/prints, smoke/videos, api).
 * @param {string} runDir
 * @returns {string[]}
 */
export function coletarArtefatosPlaywright(runDir) {
  const root = repoRoot()
  const copiados = []
  const idsSmk = idsCtComEvidenciaSmoke(runDir)

  for (const ctId of idsSmk) {
    migrarPngLegadoParaPastaCt(runDir, ctId, copiados)
    const pasta = path.join(runDir, 'smoke', 'prints', ctId)
    if (fs.existsSync(pasta)) {
      for (const png of fs.readdirSync(pasta).filter((f) => f.toLowerCase().endsWith('.png'))) {
        copiados.push(`smoke/prints/${ctId}/${png}`)
      }
    }
  }

  coletarVideosCiclo(runDir, root, idsSmk, copiados)
  coletarVideosPontuais(runDir, idsSmk, copiados)
  coletarApi(runDir, copiados)

  const jestDir = path.join(runDir, 'jest')
  if (fs.existsSync(jestDir)) {
    for (const arquivo of listarRecursivo(jestDir)) {
      copiados.push(path.relative(runDir, arquivo).replace(/\\/g, '/'))
    }
  }

  return [...new Set(copiados)]
}
