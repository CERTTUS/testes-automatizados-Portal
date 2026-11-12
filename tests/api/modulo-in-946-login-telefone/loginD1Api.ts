import type {APIResponse, TestInfo} from '@playwright/test';
import {cEnv} from '../../e2e/helpers/env';
import {C_TOKEN_REVOGADO} from '../../e2e/helpers/portalFixtures';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

/** O.S. com checklist, serviços e peças no stub MS 8087 (IN-948). */
export const C_TOKEN_OS_COM_ITENS = 'tokOsComItensIN948XXX';
/** O.S. sem itens nos cards no stub MS 8087 (IN-948). */
export const C_TOKEN_OS_SEM_ITENS = 'tokOsSemItensIN948XXX';
/** O.S. que não pertence à sessão (stub nega pelo header de origem). */
export const C_TOKEN_OS_OUTRA = 'tokOsOutraIN948XXXXXX';
/** Link bem formado sem cadastro (stub 8087 devolve 404). */
export const C_TOKEN_INEXISTENTE = 'tokNaoExisteIN949XXXX';
/** E.164 BR válido que não é o telefone da O.S. */
export const C_TELEFONE_NAO_AUTORIZADO_PADRAO = '5511888887777';
export const C_MENSAGEM_DADOS_INVALIDOS = 'Dados de acesso inválidos.';
export const C_MENSAGEM_ACESSO_NEGADO = 'Acesso não autorizado';

export function telefoneNaoAutorizado(): string {
   return cEnv('PORTAL_TELEFONE_NAO_AUTORIZADO', C_TELEFONE_NAO_AUTORIZADO_PADRAO);
}

export function tokenRevogadoLogin(): string {
   return cEnv('PORTAL_TOKEN_REVOGADO_HOMOLOG', C_TOKEN_REVOGADO);
}

export function cookieSessaoValor(oRes: APIResponse): string | null {
   for (const oCab of oRes.headersArray()) {
      if (oCab.name.toLowerCase() !== 'set-cookie') {
         continue;
      }
      const oMatch = /(?:^|[;,\s])portal_sessao=([^;]*)/.exec(oCab.value);
      if (oMatch?.[1]) {
         return oMatch[1];
      }
   }
   return null;
}

export async function respostaApiLer(
   oRes: APIResponse,
   testInfo: TestInfo,
   cCtId: string,
   cUrl: string,
): Promise<{nStatus: number; cTexto: string; oCorpo: Record<string, unknown>}> {
   const cTexto = await oRes.text();
   const nStatus = oRes.status();
   await evidenciarApiPreCr(testInfo, cCtId, nStatus, cUrl, cTexto);
   let oCorpo: Record<string, unknown> = {};
   try {
      oCorpo = JSON.parse(cTexto) as Record<string, unknown>;
   } catch {
      oCorpo = {};
   }
   return {nStatus, cTexto, oCorpo};
}

export function cookieHeaderDe(cCookie: string): {Cookie: string} {
   return {Cookie: cCookie};
}
