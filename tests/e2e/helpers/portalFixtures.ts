/** Tokens alinhados a portalcliente-web/e2e/mock-bff.mjs */
export const C_TOKEN_OK = "xK9mP2nQ4rS6tU8vW0yZ12";
export const C_TOKEN_REVOGADO = "tokRevogadoXXXXXXXXXXXX";
/** T2668 — tema/hero custom (E2E D1 portalcliente-web). */
export const C_TOKEN_TEMA_CUSTOM = "tokTemaCustomXXXXXXXX";
/** T2770 — landing fail-open (só cTemaCacheChave + tokens default no mock). */
export const C_TOKEN_FAIL_OPEN_CONFIG = "tokFailOpenConfigXXX";
/** T2770 — detalhe OS com mAbasOrdem filtrada (flags_conteudo). */
export const C_TOKEN_ABAS_FILTRADAS = "tokAbasFiltradasXXXX";
/** T2672 — D4_v2 autenticado (mock-bff). */
export const C_TOKEN_OS_D4_V2 = "tokOsD4v2XXXXXXXXXXXXXX";
/** T2666 — landing sem oTokensDerivados. */
export const C_TOKEN_SEM_TOKENS_DERIVADOS = "tokSemTokensDerivadosXX";
/** T2666 — tokens derivados com chave não `--*`. */
export const C_TOKEN_TOKENS_INVALIDOS = "tokTokensInvalidosXXX";

/** `mAbasOrdem` no BFF mock (oOrdemServico) ou MS (top-level oDados). */
export function mAbasOrdemExtrair(oDados: Record<string, unknown>): string[] | undefined {
   const mTop = oDados.mAbasOrdem;
   if (Array.isArray(mTop)) {
      return mTop.filter((c): c is string => typeof c === "string");
   }
   const oOs = oDados.oOrdemServico;
   if (oOs && typeof oOs === "object" && !Array.isArray(oOs)) {
      const mNested = (oOs as Record<string, unknown>).mAbasOrdem;
      if (Array.isArray(mNested)) {
         return mNested.filter((c): c is string => typeof c === "string");
      }
   }
   return undefined;
}

export function tokenPortalOk(): string {
  const cEnv = process.env.PORTAL_TOKEN_OK?.trim();
  return cEnv && cEnv.length > 0 ? cEnv : C_TOKEN_OK;
}

export function telefoneAutorizado(): string {
  const cEnv = process.env.PORTAL_TELEFONE_AUTORIZADO?.trim();
  return cEnv && cEnv.length > 0 ? cEnv : "5511999999999";
}
