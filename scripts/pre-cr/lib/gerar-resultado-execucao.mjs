import fs from 'node:fs'
import path from 'node:path'
import { encontrarProvaRun } from './provas-run.mjs'

function extrairIdsCenarios(cenariosMd) {
  const ids = new Set()
  const re = /\b((?:CT|CEN)-[A-Z0-9-]+)\b/gi
  let match
  while ((match = re.exec(cenariosMd)) !== null) {
    ids.add(match[1].toUpperCase())
  }
  return [...ids]
}

function titulosCenarios(cenariosMd) {
  const titulos = []
  for (const linha of cenariosMd.split('\n')) {
    const m = linha.match(/^###\s+(.+)/)
    if (m) titulos.push(m[1].trim())
  }
  return titulos.slice(0, 8)
}

function inferirTipo(ctId) {
  const id = ctId.toUpperCase()
  if (id.includes('UNIT') || id.includes('JEST')) return 'jest'
  if (id.includes('API') || id.startsWith('CEN-API')) return 'api'
  if (id.includes('SMK')) return 'smoke'
  if (id.includes('E2E')) return 'e2e'
  if (id.includes('MAN')) return 'manual'
  return 'outro'
}

/**
 * Gera resultado-execucao-dev.md + plano-execucao.json na pasta da run.
 */
export function gerarResultadoExecucaoDev({
  runDir,
  root,
  modulo,
  produto,
  devKey,
  parentKey,
  exitCode,
  npmScript,
  ambiente = 'local',
}) {
  const cenariosPath = path.join(root, modulo.docs, 'cenarios.md')
  const cenariosMd = fs.existsSync(cenariosPath) ? fs.readFileSync(cenariosPath, 'utf8') : ''
  const ids = extrairIdsCenarios(cenariosMd)
  const veredito = exitCode === 0 ? 'PASSOU' : 'REPROVOU'
  const dataIso = new Date().toISOString()

  const linhasEvidencia = []
  const porTipo = { jest: 0, api: 0, smoke: 0, manual: 0, outro: 0 }

  for (const id of ids) {
    const tipo = inferirTipo(id)
    if (tipo === 'manual' || (id.includes('E2E') && !id.includes('SMK'))) {
      continue
    }
    const prova = encontrarProvaRun(runDir, id)
    const status = veredito === 'PASSOU' && prova ? 'PASSOU' : veredito === 'PASSOU' ? 'SEM_PROVA' : 'REPROVOU'
    if (status === 'PASSOU') {
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1
    }
    linhasEvidencia.push(
      `| ${id} | ${tipo} | ${status} | ${prova ? `\`${prova}\`` : '—'} |`,
    )
  }

  if (linhasEvidencia.length === 0) {
    linhasEvidencia.push('| — | — | — | *(sem CTs em cenarios.md)* |')
  }

  const titulos = titulosCenarios(cenariosMd)
  const resumoHumano = titulos.length
    ? titulos.map((t) => `- ${t.replace(/`/g, '')}`).join('\n')
    : '- (sem títulos em cenarios.md)'

  const resultado = [
    '# resultado-execucao-dev',
    '',
    `> Dev: \`${devKey ?? '—'}\` | HU: \`${parentKey ?? devKey ?? '—'}\` | Módulo: \`${modulo.slug}\``,
    `> Data: ${dataIso}`,
    '',
    `Veredito: **${veredito}**`,
    '',
    `Comando: \`npm run ${npmScript} -- --modulo ${modulo.slug} --dev-key ${devKey ?? '—'}${parentKey ? ` --parent-key ${parentKey}` : ''}\``,
    `Ambiente: \`${ambiente}\``,
    '',
    '---',
    '',
    '## O que foi testado (linguagem de tela)',
    '',
    resumoHumano,
    '',
    'E2E e checklist manual: WU Teste (não executados neste hop).',
    '',
    '---',
    '',
    '## Resumo',
    '',
    '| Métrica | Valor |',
    '|---------|-------|',
    `| Jest | ${porTipo.jest} com prova |`,
    `| API | ${porTipo.api} com prova |`,
    `| Smoke | ${porTipo.smoke} com prova |`,
    `| Duração | — |`,
    '',
    '---',
    '',
    '## Evidências por CT (obrigatório no PASS)',
    '',
    '| CT | Tipo | Status | Arquivo de prova |',
    '|----|------|--------|------------------|',
    ...linhasEvidencia,
    '',
  ]

  fs.writeFileSync(path.join(runDir, 'resultado-execucao-dev.md'), resultado.join('\n'), 'utf8')

  const plano = {
    schema: 'qa-pre-cr-plano-execucao',
    devKey: devKey ?? null,
    parentKey: parentKey ?? devKey ?? null,
    modulo: modulo.slug,
    produto,
    ambiente,
    npmScript,
    comando: `npm run ${npmScript} -- --modulo ${modulo.slug} --dev-key ${devKey ?? ''}${parentKey ? ` --parent-key ${parentKey}` : ''}`,
    veredito,
    resumoHumano: titulos,
    executadoEm: dataIso,
    cts: ids.map((id) => ({
      id,
      tipo: inferirTipo(id),
      prova: encontrarProvaRun(runDir, id),
    })),
  }

  fs.writeFileSync(
    path.join(runDir, 'plano-execucao.json'),
    `${JSON.stringify(plano, null, 2)}\n`,
    'utf8',
  )

  return plano
}
