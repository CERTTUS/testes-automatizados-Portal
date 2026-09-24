/**
 * Empacota evidências QA_PRE_CR no layout canônico:
 * {parentKey}_{devKey}_{slug}_{veredito}_{YYYYMMDD}.zip
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  copiarStagingPreCr,
  criarManifest,
  criarZip,
  formatDateYmd,
  gerarLeiaMe,
  nomeStem,
  nomeZip,
} from './lib/empacotar.mjs'
import {
  extrairCtsPassou,
  validarEvidenciasPreCr,
  validarLeiaMe,
} from './lib/validar-evidencias-pre-cr.mjs'
import {
  garantirDir,
  parseArgs,
  repoRoot,
  resolverPastaEvidencias,
  resolverPastaZips,
  resolverUltimaRun,
} from './lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-modulos.json'), 'utf8'))
const produto = catalogo.produto || 'web'

const args = parseArgs(process.argv.slice(2))
if (!args.modulo || (!args.devKey && !args.prNumber)) {
  console.error('Uso: node scripts/pre-cr/empacotar-evidencias.mjs --modulo <slug> --dev-key <ISSUE>')
  process.exit(1)
}

const modulo = catalogo.modulos.find((m) => m.slug === args.modulo)
if (!modulo) {
  console.error(`Modulo desconhecido: ${args.modulo}`)
  process.exit(2)
}

const root = repoRoot()
const pastaBase = resolverPastaEvidencias({
  devKey: args.devKey,
  parentKey: args.parentKey,
  prNumber: args.prNumber,
  root,
})
const runDir = resolverUltimaRun(pastaBase)

if (!runDir) {
  console.error('[pre-cr] BLOQUEADO: nenhuma run em evidencias-pr — rode test:pre-cr antes.')
  process.exit(3)
}

const evidenciasValidacao = validarEvidenciasPreCr(runDir)
if (!evidenciasValidacao.ok && process.env.PRE_CR_SKIP_VALIDACAO !== '1') {
  console.error('[pre-cr] BLOQUEADO: CT(s) PASSOU sem evidência:')
  for (const f of evidenciasValidacao.faltando) {
    console.error(`  - ${f.ct}: ${f.motivo}`)
  }
  process.exit(3)
}

const veredito =
  fs.existsSync(path.join(runDir, 'resultado-execucao-dev.md')) &&
  fs.readFileSync(path.join(runDir, 'resultado-execucao-dev.md'), 'utf8').includes('PASSOU')
    ? 'PASSOU'
    : 'REPROVOU'

const dataRodada = formatDateYmd(fs.statSync(runDir).mtime)
const devKey = args.devKey ?? `PR-${args.prNumber}`
const stem = nomeStem({
  parentKey: args.parentKey,
  devKey,
  slug: modulo.slug,
  veredito,
  data: dataRodada,
})

const staging = garantirDir(path.join(pastaBase, '_staging', stem))
const docsDir = path.join(root, modulo.docs)
const ctsPassou = extrairCtsPassou(runDir)

copiarStagingPreCr({ runDir, stagingDir: staging, ctsPassou, docsDir })
gerarLeiaMe(staging)

const leiaMeErro = validarLeiaMe(staging)
if (leiaMeErro && process.env.PRE_CR_SKIP_VALIDACAO !== '1') {
  console.error(`[pre-cr] BLOQUEADO: ${leiaMeErro}`)
  process.exit(3)
}

const manifest = criarManifest({
  produto,
  devKey: args.devKey,
  parentKey: args.parentKey,
  prNumber: args.prNumber,
  modulo: modulo.slug,
  veredito,
  stem,
  npmScript: modulo.npm,
  docsCopiados: ['cenarios.md', 'resultado-execucao-dev.md', 'LEIA-ME.md'],
  runDir,
  evidenciasValidacao,
})

fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

const zipPath = path.join(garantirDir(resolverPastaZips(pastaBase)), nomeZip({
  parentKey: args.parentKey,
  devKey,
  slug: modulo.slug,
  veredito,
  data: dataRodada,
}))
criarZip(staging, zipPath)

fs.rmSync(path.join(pastaBase, '_staging'), { recursive: true, force: true })

console.log(`[pre-cr] Zip: ${zipPath}`)
console.log(`[pre-cr] Stem: ${stem}`)
console.log(`[pre-cr] Veredito: ${veredito}`)
