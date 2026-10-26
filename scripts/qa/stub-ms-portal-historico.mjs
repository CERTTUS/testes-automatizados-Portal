import http from 'node:http';

const C_TOKEN_SESSAO = 'tokSessaoHist2880Ok';
const C_TOKEN_SESSAO_422 = 'tokSessaoHist2880Off';
const C_TOKEN_ALVO_OK = 'tokAlvoHist2880Ok';
const C_TOKEN_ALVO_NEGADO = 'tokAlvoHist2880Negado';
const C_TOKEN_ALVO_REVOGADO = 'tokAlvoHist2880Revogado';
const C_TOKEN_LINK_FAVICON = 'tokLinkHist2880Favicon';
const C_TOKEN_LINK_SEM_FAVICON = 'tokLinkHist2880SemFavicon';
const C_FAVICON_URL = 'https://cdn.example.com/oficina/favicon.png';

const N_PORTA = Number(process.env.QA_STUB_MS_PORTA ?? 18881);
const C_HOST = '127.0.0.1';

/** @type {Array<{cMetodo: string, cPath: string, oHeaders: Record<string, string>}>} */
const mRequisicoes = [];

function oHeadersNormalizados(oHeaders) {
  /** @type {Record<string, string>} */
  const oSaida = {};
  for (const [cChave, uValor] of Object.entries(oHeaders)) {
    if (uValor === undefined) continue;
    oSaida[cChave.toLowerCase()] = Array.isArray(uValor) ? uValor.join(', ') : String(uValor);
  }
  return oSaida;
}

function responderJson(oRes, nStatus, oCorpo) {
  const cCorpo = JSON.stringify(oCorpo);
  oRes.writeHead(nStatus, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(cCorpo),
  });
  oRes.end(cCorpo);
}

function responderSucesso(oRes, cMensagem, oDados) {
  responderJson(oRes, 200, {lSucesso: true, cMensagem, oDados});
}

function responderErro(oRes, nStatus, cMensagem) {
  responderJson(oRes, nStatus, {lSucesso: false, cMensagem});
}

function oDetalheMinimo(cToken, oFlagsPainel, cNumeroOs = '000123') {
  return {
    cOsPublicId: cToken,
    cNumeroOs,
    oVeiculo: {cPlaca: 'ABC1D23', cMarca: 'VW', cModelo: 'Gol', cAno: '2020'},
    mCarretas: [],
    lRetifica: false,
    lTemMotor: false,
    mChecklist: [],
    mServicos: [],
    mPecas: [],
    mTimeline: [],
    mAbasOrdem: ['checklist', 'fotos', 'servicos', 'pecas'],
    oFlagsPainel,
  };
}

function oFotosSucesso() {
  return {
    mFotosPorFase: [
      {
        cFase: 'recepcao',
        cDescricao: 'Recepção',
        mFotos: [
          {
            cFotoId: 'f1',
            cUrlVisualizacao: 'https://cdn.example.com/f1.jpg',
            dCriadaEm: '2026-10-01T08:00:00-03:00',
          },
        ],
      },
    ],
  };
}

/**
 * @returns {{nStatus: number, cMensagem?: string, lAlvo?: boolean} | null}
 */
function oAutorizacaoOs(cToken, oHeaders) {
  const cOrigem = oHeaders['x-portal-token-origem'];
  if (cToken === C_TOKEN_SESSAO) {
    return {nStatus: 200};
  }
  if (cToken === C_TOKEN_ALVO_OK) {
    if (cOrigem === C_TOKEN_SESSAO) {
      return {nStatus: 200, lAlvo: true};
    }
    return {nStatus: 403, cMensagem: 'Acesso negado.'};
  }
  if (cToken === C_TOKEN_ALVO_NEGADO) {
    return {nStatus: 403, cMensagem: 'Acesso negado.'};
  }
  if (cToken === C_TOKEN_ALVO_REVOGADO) {
    return {nStatus: 410, cMensagem: 'Link revogado.'};
  }
  return {nStatus: 404, cMensagem: 'Não encontrado.'};
}

function fLerCorpo(oReq) {
  return new Promise((fOk, fErro) => {
    const mPedacos = [];
    oReq.on('data', (oBuf) => mPedacos.push(oBuf));
    oReq.on('end', () => fOk(Buffer.concat(mPedacos).toString('utf8')));
    oReq.on('error', fErro);
  });
}

function oLinkDados(cFaviconUrl) {
  return {
    cLogoUrl: '',
    lTemLogo: false,
    cNomeFantasia: 'Oficina Histórico',
    cFaviconUrl,
  };
}

const oServidor = http.createServer(async (oReq, oRes) => {
  const cMetodo = (oReq.method || 'GET').toUpperCase();
  const oUrl = new URL(oReq.url || '/', `http://${oReq.headers.host || `${C_HOST}:${N_PORTA}`}`);
  const cPath = oUrl.pathname;
  const oHeaders = oHeadersNormalizados(oReq.headers);

  if (!cPath.startsWith('/__stub/')) {
    mRequisicoes.push({cMetodo, cPath, oHeaders});
  }

  try {
    if (cMetodo === 'GET' && cPath === '/__stub/requisicoes') {
      responderJson(oRes, 200, {mRequisicoes});
      return;
    }
    if (cMetodo === 'DELETE' && cPath === '/__stub/requisicoes') {
      mRequisicoes.length = 0;
      oRes.writeHead(204);
      oRes.end();
      return;
    }

    const oLink = cPath.match(/^\/api\/v1\/servicos\/portal\/link\/([^/]+)$/);
    if (cMetodo === 'GET' && oLink) {
      const cToken = decodeURIComponent(oLink[1]);
      if (cToken === C_TOKEN_LINK_FAVICON) {
        responderSucesso(oRes, 'OK', oLinkDados(C_FAVICON_URL));
        return;
      }
      if (cToken === C_TOKEN_LINK_SEM_FAVICON) {
        responderSucesso(oRes, 'OK', oLinkDados(null));
        return;
      }
      responderErro(oRes, 404, 'Link não encontrado.');
      return;
    }

    if (cMetodo === 'POST' && cPath === '/api/v1/servicos/portal/validar-acesso') {
      const cCorpo = await fLerCorpo(oReq);
      let oBody = {};
      try {
        oBody = cCorpo ? JSON.parse(cCorpo) : {};
      } catch {
        oBody = {};
      }
      const cToken = typeof oBody.cToken === 'string' ? oBody.cToken : '';
      if (cToken === C_TOKEN_SESSAO || cToken === C_TOKEN_SESSAO_422) {
        responderSucesso(oRes, 'OK', {cToken, cOsPublicId: cToken});
        return;
      }
      responderErro(oRes, 403, 'Acesso negado.');
      return;
    }

    const oOs = cPath.match(/^\/api\/v1\/servicos\/portal\/os\/([^/]+)\/(detalhe|fotos|historico|cliente)$/);
    if (cMetodo === 'GET' && oOs) {
      const cToken = decodeURIComponent(oOs[1]);
      const cRecurso = oOs[2];

      if (cRecurso === 'historico' || cRecurso === 'cliente') {
        if (cToken === C_TOKEN_SESSAO) {
          if (cRecurso === 'historico') {
            responderSucesso(oRes, 'OK', {
              nPeriodoDias: 180,
              mFases: ['D', 'P', 'O'],
              mOrdens: [
                {
                  cOsPublicId: C_TOKEN_ALVO_OK,
                  cNumeroOs: '000777',
                  cSerie: '1',
                  cStatus: 'P',
                  cStatusDescricao: 'Produção',
                  dRecepcao: '2026-09-10T08:00:00-03:00',
                  cPlaca: 'ABC1D23',
                },
              ],
            });
            return;
          }
          responderSucesso(oRes, 'OK', {
            cNome: 'Cliente Histórico',
            cTelefone: '(11) 99999-0000',
            cEmail: 'cliente@example.com',
            cDocumentoMascarado: '***.456.789-**',
            cDocumentoTipo: 'CPF',
            cCpfCompleto: '12345678900',
          });
          return;
        }
        if (cToken === C_TOKEN_SESSAO_422) {
          responderErro(oRes, 422, 'Histórico desabilitado para esta oficina.');
          return;
        }
        responderErro(oRes, 404, 'Não encontrado.');
        return;
      }

      const oAuth = oAutorizacaoOs(cToken, oHeaders);
      if (oAuth.nStatus !== 200) {
        responderErro(oRes, oAuth.nStatus, oAuth.cMensagem || 'Não encontrado.');
        return;
      }
      if (cRecurso === 'detalhe') {
        const oFlagsPainel = oAuth.lAlvo
          ? {historico: true}
          : {evolucao: true, condicoes: true, historico: true};
        const cNumeroOs = oAuth.lAlvo ? '000777' : '000123';
        responderSucesso(oRes, 'OK', oDetalheMinimo(cToken, oFlagsPainel, cNumeroOs));
        return;
      }
      responderSucesso(oRes, 'OK', oFotosSucesso());
      return;
    }

    responderErro(oRes, 404, 'Não encontrado.');
  } catch {
    responderErro(oRes, 500, 'Erro interno do stub.');
  }
});

oServidor.listen(N_PORTA, C_HOST, () => {
  console.log(`stub-ms-portal-historico ouvindo em http://${C_HOST}:${N_PORTA}`);
});
