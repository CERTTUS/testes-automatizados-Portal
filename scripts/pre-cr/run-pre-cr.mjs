/**
 * QA_PRE_CR — executa o script npm allowlist do módulo e coleta evidências locais.
 *
 *   node scripts/pre-cr/run-pre-cr.mjs --modulo auth --dev-key IN-1234 --parent-key IN-1000
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { coletarArtefatosPlaywright } from './lib/coletar-artefatos.mjs'
import { garantirRodada } from './lib/rodada.mjs'
import { gerarResultadoExecucaoDev } from './lib/gerar-resultado-execucao.mjs'
import {
  executarSpecsPlaywright,
  filtrarSpecsPorCamadas,
  parseCamadas,
} from './lib/executar-specs.mjs'
import {
  limparRunDir,
  parseArgs,
  repoRoot,
  resolverPastaEvidencias,
  resolverRunDir,
} from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))
const produto = catalogo.produto || 'web'
const projetosPadrao = catalogo.playwrightProjects || ['chromium']

function ajuda() {
  console.log(`
QA_PRE_CR — ${produto} (Playwright)

  node scripts/pre-cr/run-pre-cr.mjs --modulo <slug> --dev-key <ISSUE> --parent-key <HU> [--camadas api|api,smoke]

Modulos: npm run pre-cr:modulos
`)
}

function buscarModulo(slug) {
  const mod = catalogo.modulos.find((m) => m.slug === slug)
  if (!mod) {
    console.error(`[pre-cr] Modulo desconhecido: ${slug}`)
    console.error('[pre-cr] Rode: npm run pre-cr:modulos')
    process.exit(2)
  }
  return mod
}

function escreverMeta(runDir, { devKey, prNumber, modulo, npmScript, exitCode, artefatos }) {
  const linhas = [
    '# meta — QA_PRE_CR',
    '',
    `- **produto:** ${produto}`,
    `- **devKey:** ${devKey ?? '—'}`,
    `- **pr:** ${prNumber ?? '—'}`,
    `- **modulo:** ${modulo.slug} (${modulo.label})`,
    `- **npm:** ${npmScript}`,
    `- **executadoEm:** ${new Date().toISOString()}`,
    `- **exitCode:** ${exitCode}`,
    `- **veredito:** ${exitCode === 0 ? 'PASSOU' : 'REPROVOU'}`,
    `- **artefatos:** ${artefatos.length ? artefatos.join(', ') : 'nenhum'}`,
    '',
  ]
  fs.writeFileSync(path.join(runDir, 'meta.md'), linhas.join('\n'), 'utf8')
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.modulo || (!args.devKey && !args.prNumber)) {
  ajuda()
  process.exit(args.help ? 0 : 1)
}

const modulo = buscarModulo(args.modulo)
const ambiente = args.ambiente === 'test-server' ? 'test-server' : 'local'
const npmScript =
  ambiente === 'test-server' && modulo.npmTestServer ? modulo.npmTestServer : modulo.npm
const camadas = parseCamadas(args.camadas)
const specsBase = Array.isArray(modulo.specs) ? modulo.specs : []
const specsFiltradas = specsBase.length ? filtrarSpecsPorCamadas(specsBase, camadas) : []
const usarSpecs = specsFiltradas.length > 0 && !modulo.npm
const projetos = modulo.playwrightProjects || projetosPadrao

const root = repoRoot()

if (args.parentKey) {
  garantirRodada({
    root,
    parentKey: args.parentKey,
    devKey: args.devKey,
    modulo,
    produto,
  })
}

const pastaBase = resolverPastaEvidencias({
  devKey: args.devKey,
  parentKey: args.parentKey,
  prNumber: args.prNumber,
  root,
})
const runDir = resolverRunDir(pastaBase)
limparRunDir(runDir)

console.log(`[pre-cr] Produto: ${produto}`)
console.log(`[pre-cr] Modulo: ${modulo.slug}`)
console.log(`[pre-cr] Camadas: ${camadas.join('+')} (E2E não roda no hop Dev)`)
if (usarSpecs && specsFiltradas.length === 0) {
  console.error(`[pre-cr] BLOQUEADO: nenhum spec ${camadas.join('/')} para este módulo.`)
  process.exit(2)
}
console.log(`[pre-cr] ${usarSpecs ? `Specs: ${specsFiltradas.join(', ')}` : `Script: npm run ${npmScript}`}`)
console.log(`[pre-cr] Evidencias: ${runDir}`)

const envRun = {
  ...process.env,
  E2E_REPORTER_LISTA: process.env.E2E_REPORTER_LISTA ?? '1',
  PW_HEADLESS: process.env.PW_HEADLESS ?? '1',
  PRE_CR: '1',
  PRE_CR_DEV_KEY: args.devKey ?? '',
  PRE_CR_PARENT_KEY: args.parentKey ?? '',
  PRE_CR_MODULO: modulo.slug,
  PRE_CR_RUN_DIR: runDir,
}

let exitCode
if (usarSpecs) {
  exitCode = executarSpecsPlaywright({
    root,
    specs: specsFiltradas,
    env: envRun,
    projects: projetos,
  })
} else if (!npmScript) {
  console.error('[pre-cr] Módulo sem npm e sem specs — rode bootstrap com --specs')
  process.exit(2)
} else {
  const isWin = process.platform === 'win32'
  const npmCmd = isWin ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCmd, ['run', npmScript], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: envRun,
  })
  exitCode = result.status ?? 1
}

const artefatos = coletarArtefatosPlaywright(runDir)
escreverMeta(runDir, {
  devKey: args.devKey,
  prNumber: args.prNumber,
  modulo,
  npmScript: usarSpecs ? 'specs' : npmScript,
  exitCode,
  artefatos,
})
gerarResultadoExecucaoDev({
  runDir,
  root,
  modulo,
  produto,
  devKey: args.devKey,
  parentKey: args.parentKey,
  exitCode,
  npmScript: usarSpecs ? 'test:pre-cr (specs)' : npmScript,
  ambiente,
})

console.log(`\n[pre-cr] Concluido — veredito: ${exitCode === 0 ? 'PASSOU' : 'REPROVOU'}`)
const parentFlag = args.parentKey ? ` --parent-key ${args.parentKey}` : ''
console.log(
  `[pre-cr] Proximo: npm run pre-cr:empacotar -- --dev-key ${args.devKey ?? args.prNumber}${parentFlag} --modulo ${modulo.slug}`,
)

process.exit(exitCode)
