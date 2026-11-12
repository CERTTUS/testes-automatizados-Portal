/**
 * Stub mínimo do MS (porta 8087). Rotas:
 *   GET  /api/v1/servicos/portal/link/:token          (landing; tema cru + oTokensDerivados)
 *   POST /api/v1/servicos/portal/validar-acesso       (login por telefone; 403 se telefone != autorizado)
 *   GET  /api/v1/servicos/portal/os/:token/(detalhe|fotos)  (cards da O.S.; header x-portal-token-origem)
 *
 * QA_STUB_TEMA_CRU=1 volta ao payload antigo, sem oTokensDerivados (o MS real deriva; o BFF só repassa).
 * QA_STUB_TELEFONE_AUTORIZADO define o telefone aceito no validar-acesso (padrão 5511999999999).
 *
 * Uso (WU Teste TALK-2810, Supabase placeholder no MS):
 *   node scripts/qa/stub-ms-portal-landing.mjs
 *   portalcliente-api: API_MICROSERVICOS_BASE_URL=http://127.0.0.1:8087
 */
import http from "node:http";

const N_PORTA = Number(process.env.QA_STUB_MS_PORTA ?? 8087);

const C_TOKEN_OK = "xK9mP2nQ4rS6tU8vW0yZ12";
const C_TOKEN_REVOGADO = "tokRevogadoXXXXXXXXXXXX";
const C_TOKEN_TEMA_CUSTOM = "tokTemaCustomXXXXXXXX";
const C_TOKEN_SEM_TOKENS_DERIVADOS = "tokSemTokensDerivadosXX";
const C_TOKEN_TOKENS_INVALIDOS = "tokTokensInvalidosXXX";

const C_TOKEN_TEMA_AVANCADO_IN949 = "tokTemaAvancadoIN949X";
const C_TOKEN_TEMA_COR_INVALIDA_IN949 = "tokTemaCorInvalidaIN949";

const C_TOKEN_OS_COM_ITENS = "tokOsComItensIN948XXX";
const C_TOKEN_OS_SEM_ITENS = "tokOsSemItensIN948XXX";
const C_TELEFONE_AUTORIZADO = (
  process.env.QA_STUB_TELEFONE_AUTORIZADO ?? "5511999999999"
).replace(/\D/g, "");
const L_TEMA_CRU = process.env.QA_STUB_TEMA_CRU === "1";

const M_TOKENS_DERIVADOS_POR_TOKEN = new Map([
  [
    C_TOKEN_OK,
    {
      "--cor-primaria": "#1a5276",
      "--cor-secundaria": "#2874a6",
      "--theme-action-primary": "#1a5276",
    },
  ],
  [
    C_TOKEN_TEMA_CUSTOM,
    {
      "--cor-primaria": "#6c3483",
      "--cor-secundaria": "#884ea0",
      "--theme-action-primary": "#6c3483",
      "--theme-action-primary-hover": "#5b2c6f",
      "--theme-action-primary-dark": "#4a235a",
    },
  ],
]);

const O_BASE = {
  cLogoUrl: "",
  lTemLogo: false,
};

function json(oRes, nStatus, oBody) {
  const cBody = JSON.stringify(oBody);
  oRes.writeHead(nStatus, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(cBody),
  });
  oRes.end(cBody);
}

function landingOk(oExtra) {
  return {
    lSucesso: true,
    cMensagem: "Link público carregado com sucesso.",
    oDados: { ...O_BASE, ...oExtra },
  };
}

// IN-949: tema (cores e avançado) que o detalhe da O.S. repassa por token.
const M_TEMA_DETALHE_POR_TOKEN = new Map([
  [
    C_TOKEN_TEMA_AVANCADO_IN949,
    {
      cCorPrimaria: "#1a5276",
      cCorSecundaria: "#2874a6",
      cTemaModo: "claro",
      oTemaAvancado: {
        editor: "avancado",
        authRodape: "#0F3D73",
        loginFundo: "#0F3D73",
      },
      // O BFF deve descartar: o detalhe não repassa oTokensDerivados.
      oTokensDerivados: { "--portal-os-footer-bg": "#ffffff" },
    },
  ],
  [
    C_TOKEN_TEMA_COR_INVALIDA_IN949,
    {
      cCorPrimaria: "#1a5276",
      cTemaModo: "claro",
      oTemaAvancado: {
        editor: "avancado",
        authRodape: "azul",
        loginFundo: "azul",
      },
    },
  ],
]);

const M_POR_TOKEN = new Map([
  [
    C_TOKEN_OK,
    {
      cNomeFantasia: "Oficina E2E",
      cTemaCacheChave: "tenantteste:0001",
      oTemaSimples: { corPrimaria: "#1a5276", corSecundaria: "#2874a6" },
    },
  ],
  [
    C_TOKEN_TEMA_CUSTOM,
    {
      cNomeFantasia: "Oficina Tema Custom",
      cTemaModo: "escuro",
      cTemaCacheChave: "tenantteste:0001",
      oTemaSimples: { corPrimaria: "#6c3483", corSecundaria: "#884ea0" },
    },
  ],
  [
    C_TOKEN_TEMA_AVANCADO_IN949,
    {
      cNomeFantasia: "Oficina Tema Avançado",
      cCorPrimaria: "#1a5276",
      cCorSecundaria: "#2874a6",
      cTemaModo: "claro",
      oTemaAvancado: {
        editor: "avancado",
        authRodape: "#0F3D73",
        loginFundo: "#0F3D73",
      },
    },
  ],
  [
    C_TOKEN_TEMA_COR_INVALIDA_IN949,
    {
      cNomeFantasia: "Oficina Cor Inválida",
      cCorPrimaria: "#1a5276",
      cTemaModo: "claro",
      oTemaAvancado: {
        editor: "avancado",
        authRodape: "azul",
        loginFundo: "azul",
      },
    },
  ],
  [
    C_TOKEN_SEM_TOKENS_DERIVADOS,
    {
      cNomeFantasia: "Oficina Sem Tema",
    },
  ],
  [
    C_TOKEN_TOKENS_INVALIDOS,
    {
      cNomeFantasia: "Oficina Tokens Mix",
      cTemaCacheChave: "tenantteste:0001",
      oTemaAvancado: {
        color: "red",
        "--cor-primaria": "#c0392b",
      },
    },
  ],
]);

const M_TOKENS_COM_OS = new Set([
  ...M_POR_TOKEN.keys(),
  C_TOKEN_OS_COM_ITENS,
  C_TOKEN_OS_SEM_ITENS,
]);

function lerCorpo(oReq) {
  return new Promise((fOk, fErro) => {
    const mPedacos = [];
    oReq.on("data", (oBuf) => mPedacos.push(oBuf));
    oReq.on("end", () => fOk(Buffer.concat(mPedacos).toString("utf8")));
    oReq.on("error", fErro);
  });
}

function oDetalheOs(cToken) {
  const oBase = {
    cOsPublicId: cToken,
    cNumeroOs: "000123",
    oVeiculo: { cPlaca: "ABC1D23", cMarca: "VW", cModelo: "Gol", cAno: "2020" },
    mCarretas: [],
    lRetifica: false,
    lTemMotor: false,
    mChecklist: [],
    mServicos: [],
    mPecas: [],
    mTimeline: [],
    mAbasOrdem: ["checklist", "fotos", "servicos", "pecas"],
    oFlagsPainel: { evolucao: true, condicoes: true },
  };
  const oTema = M_TEMA_DETALHE_POR_TOKEN.get(cToken);
  if (oTema) return { ...oBase, ...oTema };
  if (cToken !== C_TOKEN_OS_COM_ITENS) return oBase;
  return {
    ...oBase,
    cNumeroOs: "000948",
    mChecklist: [
      { cDescricao: "Estepe", nQuantidade: 1 },
      { cDescricao: "Macaco", nQuantidade: 1 },
    ],
    mServicos: [
      {
        cSecao: "Motor",
        mItens: [
          {
            cDescricao: "Troca de óleo",
            nQuantidadeTempo: 1,
            lCortesia: false,
            lNaoAprovado: false,
          },
        ],
      },
    ],
    mPecas: [
      {
        cSecao: "Motor",
        mItens: [{ cDescricao: "Filtro de óleo", nQuantidade: 1 }],
      },
    ],
  };
}

function oFotosOs(cToken) {
  if (cToken === C_TOKEN_OS_SEM_ITENS) return { mFotosPorFase: [] };
  return {
    mFotosPorFase: [
      {
        cFase: "recepcao",
        cDescricao: "Recepção",
        mFotos: [
          {
            cFotoId: "f948",
            cUrlVisualizacao:
              "https://cdn.example.com/os/000948/recepcao-01.jpg",
            dCriadaEm: "2026-11-10T08:00:00-03:00",
          },
        ],
      },
    ],
  };
}

const oServidor = http.createServer(async (oReq, oRes) => {
  try {
    await tratar(oReq, oRes);
  } catch {
    json(oRes, 500, { lSucesso: false, cMensagem: "Erro interno do stub." });
  }
});

async function tratar(oReq, oRes) {
  const cUrl = new URL(oReq.url ?? "/", `http://127.0.0.1:${N_PORTA}`);
  const cPath = cUrl.pathname;

  const oMatch = cPath.match(/^\/api\/v1\/servicos\/portal\/link\/([^/]+)$/);
  if (oReq.method === "GET" && oMatch) {
    const cToken = decodeURIComponent(oMatch[1]);
    if (cToken === C_TOKEN_REVOGADO) {
      json(oRes, 410, {
        lSucesso: false,
        cMensagem: "Link público revogado.",
      });
      return;
    }
    const oDados = M_POR_TOKEN.get(cToken);
    if (!oDados) {
      json(oRes, 404, {
        lSucesso: false,
        cMensagem: "Link público não encontrado.",
      });
      return;
    }
    const oTokens = L_TEMA_CRU
      ? undefined
      : M_TOKENS_DERIVADOS_POR_TOKEN.get(cToken);
    json(
      oRes,
      200,
      landingOk(oTokens ? { ...oDados, oTokensDerivados: oTokens } : oDados),
    );
    return;
  }

  if (
    oReq.method === "POST" &&
    cPath === "/api/v1/servicos/portal/validar-acesso"
  ) {
    const cCorpo = await lerCorpo(oReq);
    let oBody = {};
    try {
      oBody = cCorpo ? JSON.parse(cCorpo) : {};
    } catch {
      oBody = {};
    }
    const cToken = typeof oBody?.cToken === "string" ? oBody.cToken : "";
    const cTelefone =
      typeof oBody?.cTelefone === "string"
        ? oBody.cTelefone.replace(/\D/g, "")
        : "";
    if (cToken === C_TOKEN_REVOGADO) {
      json(oRes, 410, { lSucesso: false, cMensagem: "Link público revogado." });
      return;
    }
    if (!M_TOKENS_COM_OS.has(cToken)) {
      json(oRes, 404, {
        lSucesso: false,
        cMensagem: "Link público não encontrado.",
      });
      return;
    }
    if (cTelefone !== C_TELEFONE_AUTORIZADO) {
      json(oRes, 403, { lSucesso: false, cMensagem: "Acesso negado." });
      return;
    }
    json(oRes, 200, {
      lSucesso: true,
      cMensagem: "Acesso validado.",
      oDados: { cToken, cOsPublicId: cToken },
    });
    return;
  }

  const oMatchOs = cPath.match(
    /^\/api\/v1\/servicos\/portal\/os\/([^/]+)\/(detalhe|fotos)$/,
  );
  if (oReq.method === "GET" && oMatchOs) {
    const cToken = decodeURIComponent(oMatchOs[1]);
    const cOrigem = String(oReq.headers["x-portal-token-origem"] ?? "");
    if (cOrigem && cOrigem !== cToken) {
      json(oRes, 403, { lSucesso: false, cMensagem: "Acesso negado." });
      return;
    }
    if (cToken === C_TOKEN_REVOGADO) {
      json(oRes, 410, { lSucesso: false, cMensagem: "Link público revogado." });
      return;
    }
    if (!M_TOKENS_COM_OS.has(cToken)) {
      json(oRes, 404, { lSucesso: false, cMensagem: "Não encontrado." });
      return;
    }
    json(oRes, 200, {
      lSucesso: true,
      cMensagem: "OK",
      oDados: oMatchOs[2] === "detalhe" ? oDetalheOs(cToken) : oFotosOs(cToken),
    });
    return;
  }

  json(oRes, 404, { lSucesso: false, cMensagem: "Rota stub não encontrada." });
}

oServidor.listen(N_PORTA, "127.0.0.1", () => {
  console.log(
    `[qa-stub-ms-portal] ouvindo http://127.0.0.1:${N_PORTA} (portal/link/:token)`,
  );
});
