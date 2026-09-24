import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { garantirDir } from './paths.mjs'

export { garantirDir }

const DOCS_COPIAR = [
  'contexto-pr.md',
  'escopo.md',
  'cenarios.md',
  'cobertura-diff.md',
  'resumo-implementacao.md',
  'resultado-execucao.md',
  'seletores.md',
]

export function formatDateYmd(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

/**
 * Stem canônico: {parentKey}_{devKey}_{slug}_{veredito}_{YYYYMMDD}
 * @param {{ parentKey?: string, devKey?: string, slug?: string, veredito?: string, data?: string }} opts
 */
export function nomeStem({ parentKey, devKey, slug, veredito, data }) {
  const hu = (parentKey || 'SEM-HU').trim()
  const dev = (devKey || 'SEM-DEV-KEY').trim()
  const mod = (slug || 'sem-slug').trim()
  const verdict = (veredito || 'DESCONHECIDO').trim()
  const dia = data || formatDateYmd()
  return `${hu}_${dev}_${mod}_${verdict}_${dia}`
}

/** @param {Parameters<typeof nomeStem>[0]} opts */
export function nomeZip(opts) {
  return `${nomeStem(opts)}.zip`
}

export function copiarSeExistir(origem, destino) {
  if (!fs.existsSync(origem)) return false
  garantirDir(path.dirname(destino))
  fs.copyFileSync(origem, destino)
  return true
}

export function copiarDocsModulo(docsDir, stagingDir) {
  const copiados = []
  if (!fs.existsSync(docsDir)) return copiados
  for (const nome of DOCS_COPIAR) {
    const origem = path.join(docsDir, nome)
    const destino = path.join(stagingDir, nome)
    if (copiarSeExistir(origem, destino)) copiados.push(nome)
  }
  return copiados
}

export function copiarDirRecursivo(origem, destino, { maxArquivos = 200 } = {}) {
  if (!fs.existsSync(origem)) return 0
  let count = 0
  const walk = (src, dst) => {
    if (count >= maxArquivos) return
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      if (count >= maxArquivos) break
      const srcPath = path.join(src, entry.name)
      const dstPath = path.join(dst, entry.name)
      if (entry.isDirectory()) {
        garantirDir(dstPath)
        walk(srcPath, dstPath)
      } else if (entry.isFile()) {
        garantirDir(dst)
        fs.copyFileSync(srcPath, dstPath)
        count += 1
      }
    }
  }
  garantirDir(destino)
  walk(origem, destino)
  return count
}

export function criarManifest({
  produto,
  devKey,
  parentKey,
  prNumber,
  modulo,
  veredito,
  npmScript,
  docsCopiados,
  runDir,
  stem,
  evidenciasValidacao,
}) {
  return {
    schema: 'harness-qa-pre-cr',
    versao: 3,
    produto,
    devKey: devKey ?? null,
    parentKey: parentKey ?? null,
    prNumber: prNumber ?? null,
    modulo,
    veredito,
    stem: stem ?? null,
    npmScript,
    geradoEm: new Date().toISOString(),
    docsCopiados,
    runDir: runDir ?? null,
    meloqa: 'nao-publicado-na-dev',
    evidenciasPorCt: evidenciasValidacao ?? { ok: true, faltando: [] },
  }
}

/** Compacta a pasta stem (não o conteúdo com `\*`). */
export function criarZip(pastaOrigem, arquivoZip) {
  garantirDir(path.dirname(arquivoZip))
  if (fs.existsSync(arquivoZip)) fs.unlinkSync(arquivoZip)

  if (process.platform === 'win32') {
    const ps = [
      'Compress-Archive',
      `-Path "${pastaOrigem}"`,
      `-DestinationPath "${arquivoZip}"`,
      '-Force',
    ].join(' ')
    const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' })
    if (result.status !== 0) throw new Error(`Falha ao criar zip: ${arquivoZip}`)
    return arquivoZip
  }

  const parent = path.dirname(pastaOrigem)
  const base = path.basename(pastaOrigem)
  const result = spawnSync('zip', ['-r', arquivoZip, base], { cwd: parent, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Falha ao criar zip: ${arquivoZip}`)
  return arquivoZip
}

/**
 * Gera LEIA-ME.md com sequência por CT (fail-closed no empacotar).
 * @param {string} stagingDir
 */
export function gerarLeiaMe(stagingDir) {
  const linhas = [
    '# LEIA-ME — Evidências QA_PRE_CR',
    '',
    'Percorra os PNG na ordem numérica (`01-`, `02-`, …, `99-tela-final`).',
    '',
    '| CT | Pasta | Sequência | O que cada imagem mostra |',
    '|----|-------|-----------|--------------------------|',
  ]

  const printsRoot = path.join(stagingDir, 'smoke', 'prints')
  if (fs.existsSync(printsRoot)) {
    const cts = fs
      .readdirSync(printsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
    for (const ctId of cts) {
      const pastaRel = `smoke/prints/${ctId}/`
      const pngs = fs
        .readdirSync(path.join(printsRoot, ctId))
        .filter((f) => f.toLowerCase().endsWith('.png'))
        .sort()
      const descricao = pngs
        .map((p) => {
          if (p === '99-tela-final.png') return 'tela final do CT'
          return p.replace(/^\d{2}-/, '').replace(/\.png$/i, '').replace(/-/g, ' ')
        })
        .join(' → ')
      linhas.push(`| ${ctId} | \`${pastaRel}\` | ${pngs.join(', ')} | ${descricao} |`)
    }
  }

  const apiDir = path.join(stagingDir, 'api')
  if (fs.existsSync(apiDir)) {
    linhas.push('', '## API', '')
    for (const nome of fs.readdirSync(apiDir).filter((f) => f.endsWith('-response.json')).sort()) {
      const ctId = nome.replace(/-response\.json$/i, '')
      linhas.push(`- **${ctId}:** \`api/${nome}\` + \`api/${ctId}-resumo.md\``)
    }
  }

  fs.writeFileSync(path.join(stagingDir, 'LEIA-ME.md'), `${linhas.join('\n')}\n`, 'utf8')
}

/**
 * Copia layout canônico para staging (somente CT PASSOU).
 * @param {{ runDir: string, stagingDir: string, ctsPassou: string[], docsDir: string }} opts
 */
export function copiarStagingPreCr({ runDir, stagingDir, ctsPassou, docsDir }) {
  copiarSeExistir(
    path.join(runDir, 'resultado-execucao-dev.md'),
    path.join(stagingDir, 'resultado-execucao-dev.md'),
  )
  copiarSeExistir(path.join(docsDir, 'cenarios.md'), path.join(stagingDir, 'cenarios.md'))

  for (const ctId of ctsPassou) {
    const id = ctId.toUpperCase()
    if (id.includes('SMK')) {
      copiarDirRecursivo(
        path.join(runDir, 'smoke', 'prints', id),
        path.join(stagingDir, 'smoke', 'prints', id),
      )
      copiarDirRecursivo(
        path.join(runDir, 'smoke', 'videos', id),
        path.join(stagingDir, 'smoke', 'videos', id),
      )
    }
    if (id.includes('API') || id.startsWith('CEN-API')) {
      const apiDir = path.join(stagingDir, 'api')
      garantirDir(apiDir)
      for (const sufixo of ['-response.json', '-resumo.md']) {
        copiarSeExistir(path.join(runDir, 'api', `${id}${sufixo}`), path.join(apiDir, `${id}${sufixo}`))
      }
    }
  }

  copiarDirRecursivo(path.join(runDir, 'jest'), path.join(stagingDir, 'jest'))
}
