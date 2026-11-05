#!/usr/bin/env node
/**
 * Bateria de release — executor comum aos repositórios de testes CERTTUS.
 *
 * Roda, em ordem, as fases declaradas em `release.config.mjs` (raiz do repo):
 * pré-voo do ambiente → fases de teste → fases "sempre" (limpeza).
 * Para na primeira fase que falhar (stop-on-fail), grava relatório e diz
 * como retomar dali.
 *
 * Este arquivo é IGUAL em todos os repos. O que muda por repo é só o
 * `release.config.mjs`. Ao corrigir algo aqui, replique nos outros repos.
 *
 * Uso:
 *   npm run test:release                      # bateria completa
 *   npm run test:release -- --listar          # mostra as fases e sai
 *   npm run test:release -- --de=<fase>       # retoma a partir de uma fase
 *   npm run test:release -- --so=<f1,f2>      # roda só estas fases
 *   npm run test:release -- --pular=<f1,f2>   # pula estas fases
 *   npm run test:release -- --incluir=<f1>    # inclui fase opt-in (ex.: destrutiva)
 *   npm run test:release -- --continuar       # não para na 1ª falha
 *   npm run test:release -- --sem-pre-voo     # pula o pré-voo (não recomendado)
 *
 * Também aceita variáveis de ambiente: RELEASE_DE, RELEASE_SO, RELEASE_PULAR,
 * RELEASE_INCLUIR, RELEASE_CONTINUAR=1, RELEASE_SEM_PRE_VOO=1.
 *
 * Variáveis das fases: `envPadrao` da config é só o valor padrão (o terminal
 * pode sobrescrever, ex.: PW_MAX_FAILURES=0); `env` de cada fase é fixo.
 *
 * Códigos de saída: 0 = tudo passou · 1 = alguma fase falhou · 2 = pré-voo
 * ou configuração inválida.
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();
const ARQUIVO_CONFIG = path.join(RAIZ, 'release.config.mjs');
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const cor = (c, t) => (process.stdout.isTTY ? `\x1b[${c}m${t}\x1b[0m` : t);
const verde = (t) => cor('32', t);
const vermelho = (t) => cor('31', t);
const amarelo = (t) => cor('33', t);
const negrito = (t) => cor('1', t);
const cinza = (t) => cor('90', t);

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
function lerArgs(argv) {
  const oArgs = {};
  for (const sArg of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(sArg);
    if (m) oArgs[m[1]] = m[2] ?? true;
  }
  const lista = (sValor) =>
    String(sValor || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    lListar: Boolean(oArgs.listar),
    sDe: oArgs.de || process.env.RELEASE_DE || '',
    aSo: lista(oArgs.so || process.env.RELEASE_SO),
    aPular: lista(oArgs.pular || process.env.RELEASE_PULAR),
    aIncluir: lista(oArgs.incluir || process.env.RELEASE_INCLUIR),
    lContinuar: Boolean(oArgs.continuar) || process.env.RELEASE_CONTINUAR === '1',
    lSemPreVoo: Boolean(oArgs['sem-pre-voo']) || process.env.RELEASE_SEM_PRE_VOO === '1',
  };
}

// ---------------------------------------------------------------------------
// .env (só leitura, para o pré-voo — não é repassado aos processos filhos)
// ---------------------------------------------------------------------------
function lerArquivosEnv(aArquivos = []) {
  const oEnv = {};
  for (const sArq of aArquivos) {
    const sCaminho = path.join(RAIZ, sArq);
    if (!fs.existsSync(sCaminho)) continue;
    for (const sLinha of fs.readFileSync(sCaminho, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(sLinha);
      if (!m || m[1] in oEnv) continue;
      oEnv[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  // process.env tem prioridade sobre os arquivos
  return { ...oEnv, ...process.env };
}

// ---------------------------------------------------------------------------
// Pré-voo genérico: variáveis obrigatórias, URLs no ar, .only esquecido
// ---------------------------------------------------------------------------
function listarArquivos(sDir, aExt, aSaida = []) {
  if (!fs.existsSync(sDir)) return aSaida;
  for (const oEnt of fs.readdirSync(sDir, { withFileTypes: true })) {
    if (oEnt.name === 'node_modules' || oEnt.name.startsWith('.')) continue;
    const sCaminho = path.join(sDir, oEnt.name);
    if (oEnt.isDirectory()) listarArquivos(sCaminho, aExt, aSaida);
    else if (aExt.some((e) => oEnt.name.endsWith(e))) aSaida.push(sCaminho);
  }
  return aSaida;
}

async function checarUrl(sUrl, nTimeoutMs = 10000) {
  const oCtrl = new AbortController();
  const oTimer = setTimeout(() => oCtrl.abort(), nTimeoutMs);
  try {
    const oResp = await fetch(sUrl, { signal: oCtrl.signal, redirect: 'manual' });
    // Qualquer resposta < 500 prova que o serviço está no ar (401/404 incluídos)
    return { lOk: oResp.status < 500, sDetalhe: `HTTP ${oResp.status}` };
  } catch (oErro) {
    return { lOk: false, sDetalhe: oErro.name === 'AbortError' ? 'timeout' : oErro.cause?.code || oErro.message };
  } finally {
    clearTimeout(oTimer);
  }
}

async function rodarPreVoo(oPreVoo = {}) {
  const aProblemas = [];
  const aAvisos = [];
  const oEnv = lerArquivosEnv(oPreVoo.arquivosEnv);

  for (const sVar of oPreVoo.envObrigatorias || []) {
    if (!String(oEnv[sVar] ?? '').trim()) aProblemas.push(`Variável obrigatória vazia: ${sVar}`);
  }

  for (const oUrl of oPreVoo.urls || []) {
    const sUrl = oUrl.env ? oEnv[oUrl.env] || oUrl.padrao : oUrl.url;
    const sRotulo = oUrl.nome || oUrl.env || sUrl;
    if (!sUrl) {
      aProblemas.push(`URL não definida para ${sRotulo}`);
      continue;
    }
    const sAlvo = oUrl.caminho ? new URL(oUrl.caminho, sUrl).toString() : sUrl;
    const { lOk, sDetalhe } = await checarUrl(sAlvo, oUrl.timeoutMs);
    const sLinha = `${sRotulo} (${sAlvo}) → ${sDetalhe}`;
    if (lOk) console.log(`  ${verde('✓')} ${sLinha}`);
    else if (oUrl.opcional) aAvisos.push(`${sLinha} (opcional)`);
    else aProblemas.push(`Serviço fora do ar: ${sLinha}`);
  }

  if (oPreVoo.proibirOnly !== false) {
    const aDirs = oPreVoo.pastasTestes || ['tests', 'test', 'cypress/e2e'];
    const aExt = ['.ts', '.js', '.mjs', '.cjs'];
    const reOnly = /\b(?:it|test|describe|context)\.only\s*\(/;
    for (const sDir of aDirs) {
      for (const sArq of listarArquivos(path.join(RAIZ, sDir), aExt)) {
        const aLinhas = fs.readFileSync(sArq, 'utf8').split(/\r?\n/);
        aLinhas.forEach((sLinha, i) => {
          if (reOnly.test(sLinha) && !/^\s*(\/\/|\*)/.test(sLinha)) {
            aProblemas.push(`.only esquecido: ${path.relative(RAIZ, sArq)}:${i + 1}`);
          }
        });
      }
    }
  }

  return { aProblemas, aAvisos };
}

// ---------------------------------------------------------------------------
// Execução de uma fase (stdout/stderr no terminal + log em arquivo)
// ---------------------------------------------------------------------------
function rodarComando(sComando, oEnv, sArqLog) {
  return new Promise((resolve) => {
    const oLog = fs.createWriteStream(sArqLog);
    oLog.write(`$ ${sComando}\n\n`);
    const oFilho = spawn(sComando, {
      cwd: RAIZ,
      shell: true,
      env: oEnv,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    const encaminhar = (oDestino) => (oBuf) => {
      oDestino.write(oBuf);
      oLog.write(oBuf.toString().replace(ANSI, ''));
    };
    oFilho.stdout.on('data', encaminhar(process.stdout));
    oFilho.stderr.on('data', encaminhar(process.stderr));
    oFilho.on('error', (oErro) => {
      oLog.write(`\n[erro ao iniciar] ${oErro.message}\n`);
    });
    oFilho.on('close', (nCodigo, sSinal) => {
      oLog.end(`\n[saída] código=${nCodigo} sinal=${sSinal ?? '-'}\n`);
      resolve(nCodigo ?? 1);
    });
  });
}

function formatarDuracao(nMs) {
  const nSeg = Math.round(nMs / 1000);
  if (nSeg < 60) return `${nSeg}s`;
  const nMin = Math.floor(nSeg / 60);
  if (nMin < 60) return `${nMin}m${String(nSeg % 60).padStart(2, '0')}s`;
  return `${Math.floor(nMin / 60)}h${String(nMin % 60).padStart(2, '0')}m`;
}

function infoGit() {
  const rodar = (sCmd) => {
    try {
      return execSync(sCmd, { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return '?';
    }
  };
  return { sBranch: rodar('git rev-parse --abbrev-ref HEAD'), sCommit: rodar('git rev-parse --short HEAD') };
}

// ---------------------------------------------------------------------------
// Seleção de fases
// ---------------------------------------------------------------------------
function selecionarFases(aFases, oArgs) {
  const aIds = aFases.map((f) => f.id);
  const aDesconhecidas = [oArgs.sDe, ...oArgs.aSo, ...oArgs.aPular, ...oArgs.aIncluir].filter(
    (s) => s && !aIds.includes(s),
  );
  if (aDesconhecidas.length) {
    throw new Error(`Fase(s) desconhecida(s): ${aDesconhecidas.join(', ')}. Use --listar.`);
  }
  const nInicio = oArgs.sDe ? aIds.indexOf(oArgs.sDe) : 0;

  return aFases.map((oFase, i) => {
    const sFlagOptIn = oFase.optIn?.env;
    const lOptInLiberado =
      !oFase.optIn || oArgs.aIncluir.includes(oFase.id) || (sFlagOptIn && process.env[sFlagOptIn] === '1');
    let sMotivoPulo = '';
    if (oArgs.aSo.length && !oArgs.aSo.includes(oFase.id)) sMotivoPulo = 'fora do --so';
    else if (oArgs.aPular.includes(oFase.id)) sMotivoPulo = '--pular';
    else if (i < nInicio && !oFase.sempre) sMotivoPulo = `antes de --de=${oArgs.sDe}`;
    else if (!lOptInLiberado)
      sMotivoPulo = `opt-in: use --incluir=${oFase.id}${sFlagOptIn ? ` ou ${sFlagOptIn}=1` : ''}`;
    return { ...oFase, sMotivoPulo };
  });
}

const larguraIds = (aItens) => Math.max(12, ...aItens.map((o) => o.id.length)) + 2;

function imprimirFases(oConfig, aFases) {
  console.log(negrito(`\nFases da bateria de release — ${oConfig.produto}\n`));
  const nLarg = larguraIds(aFases);
  for (const oFase of aFases) {
    const aTags = [];
    if (oFase.sempre) aTags.push('sempre roda');
    if (oFase.optIn) aTags.push(`opt-in: ${oFase.optIn.motivo || oFase.optIn.env || 'manual'}`);
    const sStatus = oFase.sMotivoPulo ? amarelo(`(pula: ${oFase.sMotivoPulo})`) : verde('(roda)');
    console.log(`  ${negrito(oFase.id.padEnd(nLarg))} ${oFase.nome} ${sStatus}`);
    if (aTags.length) console.log(`  ${''.padEnd(nLarg)} ${cinza(aTags.join(' · '))}`);
    console.log(`  ${''.padEnd(nLarg)} ${cinza('$ ' + oFase.comando)}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
function gravarRelatorio(sDir, oResumo) {
  fs.writeFileSync(path.join(sDir, 'resumo.json'), JSON.stringify(oResumo, null, 2));
  const icone = { passou: '✅', falhou: '❌', pulou: '⏭️', 'não rodou': '⏸️' };
  const aLinhas = [
    `# Bateria de release — ${oResumo.produto}`,
    '',
    `- **Resultado:** ${oResumo.lAprovado ? '✅ APROVADO' : '❌ REPROVADO'}`,
    `- **Branch / commit:** \`${oResumo.git.sBranch}\` @ \`${oResumo.git.sCommit}\``,
    `- **Início:** ${oResumo.sInicio}`,
    `- **Duração total:** ${oResumo.sDuracao}`,
    '',
    '| Fase | Nome | Status | Duração | Log |',
    '|---|---|---|---|---|',
    ...oResumo.aFases.map(
      (f) =>
        `| \`${f.id}\` | ${f.nome} | ${icone[f.status] || ''} ${f.status}${f.sMotivo ? ` (${f.sMotivo})` : ''} | ${
          f.sDuracao || '—'
        } | ${f.sLog ? `[log](${f.sLog})` : '—'} |`,
    ),
    '',
  ];
  if (oResumo.aAvisosPreVoo?.length) {
    aLinhas.push('## Avisos do pré-voo', '', ...oResumo.aAvisosPreVoo.map((s) => `- ${s}`), '');
  }
  if (oResumo.sRetomar) aLinhas.push('## Como retomar', '', '```bash', oResumo.sRetomar, '```', '');
  fs.writeFileSync(path.join(sDir, 'resumo.md'), aLinhas.join('\n'));
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(ARQUIVO_CONFIG)) {
    console.error(vermelho(`Config não encontrada: ${ARQUIVO_CONFIG}`));
    return 2;
  }
  const oConfig = (await import(pathToFileURL(ARQUIVO_CONFIG).href)).default;
  const oArgs = lerArgs(process.argv.slice(2));

  let aFases;
  try {
    aFases = selecionarFases(oConfig.fases, oArgs);
  } catch (oErro) {
    console.error(vermelho(oErro.message));
    return 2;
  }
  if (oArgs.lListar) {
    imprimirFases(oConfig, aFases);
    return 0;
  }

  const oInicio = new Date();
  const sCarimbo = oInicio.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const sDirRel = path.join(RAIZ, oConfig.relatorioDir || 'release-report', sCarimbo);
  fs.mkdirSync(sDirRel, { recursive: true });
  const oGit = infoGit();

  console.log(negrito(`\n▶ Bateria de release — ${oConfig.produto}`));
  console.log(cinza(`  branch ${oGit.sBranch} @ ${oGit.sCommit} · relatório em ${path.relative(RAIZ, sDirRel)}`));
  imprimirFases(oConfig, aFases);

  const oResumo = {
    produto: oConfig.produto,
    git: oGit,
    sInicio: oInicio.toISOString(),
    aFases: [],
    aAvisosPreVoo: [],
    lAprovado: false,
  };

  // Pré-voo
  if (!oArgs.lSemPreVoo && oConfig.preVoo) {
    console.log(negrito('▶ Pré-voo do ambiente'));
    const { aProblemas, aAvisos } = await rodarPreVoo(oConfig.preVoo);
    oResumo.aAvisosPreVoo = aAvisos;
    aAvisos.forEach((s) => console.log(`  ${amarelo('!')} ${s}`));
    if (aProblemas.length) {
      aProblemas.forEach((s) => console.log(`  ${vermelho('✗')} ${s}`));
      console.log(vermelho('\n✗ Pré-voo reprovado — corrija o ambiente antes de rodar a bateria.\n'));
      oResumo.aFases.push({ id: 'pre-voo', nome: 'Pré-voo do ambiente', status: 'falhou', sMotivo: aProblemas.join('; ') });
      oResumo.sDuracao = formatarDuracao(Date.now() - oInicio.getTime());
      gravarRelatorio(sDirRel, oResumo);
      return 2;
    }
    console.log(verde('  ✓ Pré-voo OK\n'));
  }

  // Fases
  let sPrimeiraFalha = '';
  for (const oFase of aFases) {
    const oItem = { id: oFase.id, nome: oFase.nome, status: 'não rodou' };
    oResumo.aFases.push(oItem);

    if (oFase.sMotivoPulo) {
      oItem.status = 'pulou';
      oItem.sMotivo = oFase.sMotivoPulo;
      continue;
    }
    if (sPrimeiraFalha && !oArgs.lContinuar && !oFase.sempre) {
      oItem.sMotivo = `bateria parada em ${sPrimeiraFalha}`;
      continue;
    }

    console.log(negrito(`\n▶ [${oFase.id}] ${oFase.nome}`));
    console.log(cinza(`  $ ${oFase.comando}\n`));
    const sArqLog = path.join(sDirRel, `${oFase.id}.log`);
    const nInicioFase = Date.now();
    // Ordem: padrão da config < terminal < env fixo da fase
    const oEnvFase = {
      FORCE_COLOR: process.stdout.isTTY ? '1' : '0',
      ...oConfig.envPadrao,
      ...process.env,
      ...oFase.env,
    };
    const nCodigo = await rodarComando(oFase.comando, oEnvFase, sArqLog);
    oItem.sDuracao = formatarDuracao(Date.now() - nInicioFase);
    oItem.sLog = path.basename(sArqLog);
    oItem.status = nCodigo === 0 ? 'passou' : 'falhou';

    if (nCodigo === 0) {
      console.log(verde(`\n✓ [${oFase.id}] passou (${oItem.sDuracao})`));
    } else {
      console.log(vermelho(`\n✗ [${oFase.id}] falhou com código ${nCodigo} (${oItem.sDuracao})`));
      if (!sPrimeiraFalha) sPrimeiraFalha = oFase.id;
    }
  }

  // Resumo final
  oResumo.lAprovado = !sPrimeiraFalha;
  oResumo.sDuracao = formatarDuracao(Date.now() - oInicio.getTime());
  if (sPrimeiraFalha) oResumo.sRetomar = `npm run test:release -- --de=${sPrimeiraFalha}`;
  gravarRelatorio(sDirRel, oResumo);

  console.log(negrito(`\n══════ Resumo da bateria de release — ${oConfig.produto} ══════`));
  const nLarg = larguraIds(oResumo.aFases);
  for (const f of oResumo.aFases) {
    const sStatus =
      f.status === 'passou'
        ? verde('✓ passou')
        : f.status === 'falhou'
          ? vermelho('✗ falhou')
          : amarelo(`- ${f.status}${f.sMotivo ? ` (${f.sMotivo})` : ''}`);
    console.log(`  ${f.id.padEnd(nLarg)} ${sStatus} ${cinza(f.sDuracao || '')}`);
  }
  console.log(`\n  Duração total: ${oResumo.sDuracao}`);
  console.log(`  Relatório: ${path.relative(RAIZ, path.join(sDirRel, 'resumo.md'))}`);
  if (sPrimeiraFalha) {
    console.log(vermelho(`\n✗ REPROVADO — primeira falha em [${sPrimeiraFalha}].`));
    console.log(`  Corrija e retome com: ${negrito(oResumo.sRetomar)}\n`);
    return 1;
  }
  console.log(verde('\n✓ APROVADO — todas as fases obrigatórias passaram.\n'));
  return 0;
}

main()
  .then((nCodigo) => process.exit(nCodigo))
  .catch((oErro) => {
    console.error(vermelho(`Erro inesperado no executor de release: ${oErro.stack || oErro}`));
    process.exit(2);
  });
