import fs from 'node:fs'
import path from 'node:path'

/** Arquivos de controle da run — não são prova de CT. */
export const ARQUIVOS_SISTEMA_RUN = new Set([
  'meta.md',
  'resultado-execucao-dev.md',
  'plano-execucao.json',
  'manifest-cts.jsonl',
])

export const EXT_PROVA = ['.png', '.json', '.xml', '.webm', '.mp4', '.zip']

const RE_ARQUIVO_CT = /^CT-[A-Z0-9-]+-/i

export function ehArquivoProvaCt(nomeArquivo) {
  const base = path.basename(nomeArquivo)
  if (ARQUIVOS_SISTEMA_RUN.has(base)) return false
  if (!RE_ARQUIVO_CT.test(base)) return false
  return EXT_PROVA.some((ext) => base.toLowerCase().endsWith(ext))
}

function listarArquivosRecursivo(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listarArquivosRecursivo(full, acc)
    else acc.push(full)
  }
  return acc
}

/** Lista provas na run (layout canônico smoke/api + legado). */
export function listarProvasRun(runDir) {
  const arquivos = []
  if (!fs.existsSync(runDir)) return arquivos

  for (const entry of fs.readdirSync(runDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (ehArquivoProvaCt(entry.name)) {
      arquivos.push(path.join(runDir, entry.name))
    }
  }

  for (const sub of ['smoke', 'api', 'evidencias', 'jest']) {
    const base = path.join(runDir, sub)
    for (const arquivo of listarArquivosRecursivo(base)) {
      if (sub === 'jest' || ehArquivoProvaCt(arquivo)) arquivos.push(arquivo)
    }
  }

  return arquivos
}

export function encontrarProvaRun(runDir, ctId) {
  const prefixo = ctId.toUpperCase()
  for (const arquivo of listarProvasRun(runDir)) {
    const base = path.basename(arquivo)
    if (!base.toUpperCase().includes(prefixo)) continue
    if (EXT_PROVA.some((ext) => base.toLowerCase().endsWith(ext))) {
      return path.relative(runDir, arquivo).replace(/\\/g, '/')
    }
  }

  if (prefixo.startsWith('CT-UNIT') || prefixo.startsWith('CT-JEST') || prefixo.startsWith('CEN-UNIT')) {
    for (const nome of ['junit.xml', 'resultado.json', 'resultado-validacao.json', 'run.log']) {
      const p = path.join(runDir, 'jest', nome)
      if (fs.existsSync(p)) return `jest/${nome}`
    }
  }

  return null
}

/**
 * Unifica tudo na raiz da run: move arquivos de evidencias/** para runDir e remove subpastas.
 * @returns {number} arquivos movidos
 */
export function flattenRunDir(runDir) {
  if (!fs.existsSync(runDir)) return 0
  let movidos = 0

  const moverParaRaiz = (origem, nomeDestino) => {
    const destino = path.join(runDir, nomeDestino)
    if (fs.existsSync(destino)) return
    fs.renameSync(origem, destino)
    movidos += 1
  }

  for (const entry of fs.readdirSync(runDir, { withFileTypes: true })) {
    if (!entry.isFile() || !ehArquivoProvaCt(entry.name)) continue
    /* já na raiz */
  }

  const legado = path.join(runDir, 'evidencias')
  if (fs.existsSync(legado)) {
    for (const arquivo of listarArquivosRecursivo(legado)) {
      if (!ehArquivoProvaCt(arquivo)) continue
      moverParaRaiz(arquivo, path.basename(arquivo))
    }
    fs.rmSync(legado, { recursive: true, force: true })
  }

  return movidos
}
