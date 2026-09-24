import fs from 'node:fs'
import path from 'node:path'
import { RUN_ATUAL, garantirDir, resolverPastaEvidencias, repoRoot } from './paths.mjs'

/**
 * Pasta de artefatos da rodada — sempre ancorada na tarefa pai (História).
 * @param {{ parentKey: string, root?: string }} opts
 */
export function resolverDocsRodada({ parentKey, root = repoRoot() }) {
  if (!parentKey?.trim()) {
    throw new Error('parentKey obrigatório — use --parent-key IN-884 (tarefa pai / História)')
  }
  return path.join(root, 'docs', 'tests', parentKey.trim())
}

/**
 * Resolve docs do módulo: parentKey tem prioridade sobre catalogo.docs legado.
 */
export function resolverDocsModulo(modulo, parentKey, root = repoRoot()) {
  if (parentKey?.trim()) {
    return resolverDocsRodada({ parentKey, root })
  }
  if (modulo?.parentKey) {
    return resolverDocsRodada({ parentKey: modulo.parentKey, root })
  }
  if (modulo?.docs) {
    return path.join(root, modulo.docs)
  }
  throw new Error('Informe --parent-key <HU> ou defina parentKey no catálogo')
}

function mesclarHandoff(anterior, novo) {
  return {
    ...anterior,
    ...novo,
    atualizadoEm: new Date().toISOString(),
  }
}

function templateStatus({ parentKey, devKey, testeKey, modulo, produto }) {
  const cModulo = typeof modulo === 'string' ? modulo : modulo?.slug ?? '—'
  return `# Status da rodada — \`${parentKey}\`

> Atualizar **após cada hop**. Fonte da verdade entre chats.

| Campo | Valor |
|-------|--------|
| fase | \`iniciado\` |
| produto | \`${produto ?? '—'}\` |
| Historia (parentKey) | \`${parentKey}\` |
| Teste / Dev | \`${testeKey ?? devKey ?? '—'}\` |
| modulo (slug) | \`${cModulo}\` |
| artefatos | \`docs/tests/${parentKey}/\` |
| evidencias | \`evidencias-pr/${parentKey}/${devKey ?? testeKey ?? '—'}/\` |

**Proximo passo:** seguir pipeline QA (contexto → cenários → automação → execução).
`
}

/**
 * Garante pastas da rodada no início do ciclo (mesmo com hop parcial).
 * @returns {{ docsDir: string, pastaEvidencias: string, handoffPath: string, statusPath: string }}
 */
export function garantirRodada({
  root = repoRoot(),
  parentKey,
  devKey,
  testeKey,
  modulo,
  produto = 'portal',
}) {
  const cParent = parentKey?.trim()
  const cDev = devKey?.trim()
  if (!cParent) {
    throw new Error('parentKey obrigatório — exemplo: --parent-key IN-884')
  }

  const docsDir = garantirDir(resolverDocsRodada({ parentKey: cParent, root }))
  const pastaEvidencias = cDev
    ? garantirDir(resolverPastaEvidencias({ devKey: cDev, parentKey: cParent, root }))
    : garantirDir(path.join(root, 'evidencias-pr', cParent))

  garantirDir(path.join(pastaEvidencias, 'runs', RUN_ATUAL))
  garantirDir(path.join(pastaEvidencias, 'runs', 'historico'))

  const handoffPath = path.join(docsDir, 'harness-handoff.json')
  const slug = typeof modulo === 'string' ? modulo : modulo?.slug ?? null
  const handoffNovo = {
    harness: 'v2',
    parentKey: cParent,
    testeKey: testeKey?.trim() || cDev || null,
    devKey: cDev || null,
    modulo: slug,
    produto,
    artefatosDir: `docs/tests/${cParent}/`,
    evidenciasDir: cDev
      ? `evidencias-pr/${cParent}/${cDev}/`
      : `evidencias-pr/${cParent}/`,
    iniciadoEm: new Date().toISOString(),
  }

  let handoff = handoffNovo
  if (fs.existsSync(handoffPath)) {
    try {
      handoff = mesclarHandoff(JSON.parse(fs.readFileSync(handoffPath, 'utf8')), handoffNovo)
    } catch {
      handoff = handoffNovo
    }
  }
  fs.writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8')

  const statusPath = path.join(docsDir, 'status.md')
  if (!fs.existsSync(statusPath)) {
    fs.writeFileSync(
      statusPath,
      templateStatus({
        parentKey: cParent,
        devKey: cDev,
        testeKey: testeKey?.trim() || cDev,
        modulo,
        produto,
      }),
      'utf8',
    )
  }

  return { docsDir, pastaEvidencias, handoffPath, statusPath }
}
