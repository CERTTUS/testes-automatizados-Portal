/**
 * Stub mínimo do MS — GET /api/v1/servicos/portal/link/:token
 * Massa em formato MS (tema cru), sem oTokensDerivados — o BFF real deriva via culori.
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

const oServidor = http.createServer((oReq, oRes) => {
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
    json(oRes, 200, landingOk(oDados));
    return;
  }

  json(oRes, 404, { lSucesso: false, cMensagem: "Rota stub não encontrada." });
});

oServidor.listen(N_PORTA, "127.0.0.1", () => {
  console.log(
    `[qa-stub-ms-portal] ouvindo http://127.0.0.1:${N_PORTA} (portal/link/:token)`,
  );
});
