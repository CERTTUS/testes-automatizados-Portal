import type {APIRequestContext, APIResponse} from '@playwright/test';

const N_TENTATIVAS_PADRAO = 8;
const N_ESPERA_INICIAL_MS = 2_000;
const N_ESPERA_TETO_MS = 20_000;

function calcularEspera429(nTentativa: number): number {
   const nBase = N_ESPERA_INICIAL_MS * Math.pow(1.4, nTentativa);
   return Math.min(Math.round(nBase), N_ESPERA_TETO_MS);
}

async function aguardarBackoff429(nTentativa: number): Promise<void> {
   await new Promise((r) => setTimeout(r, calcularEspera429(nTentativa)));
}

/**
 * Homolog: o MS pode responder 429 após vários PATCHs/landings na mesma bateria.
 */
export async function requisicaoGetComRetry429(
   request: APIRequestContext,
   cUrl: string,
   oOpcoes?: Parameters<APIRequestContext['get']>[1],
): Promise<APIResponse> {
   let oUltima: APIResponse | undefined;
   for (let n = 0; n < N_TENTATIVAS_PADRAO; n++) {
      oUltima = await request.get(cUrl, oOpcoes);
      if (oUltima.status() !== 429) {
         return oUltima;
      }
      await aguardarBackoff429(n);
   }
   return oUltima as APIResponse;
}

export async function requisicaoPostComRetry429(
   request: APIRequestContext,
   cUrl: string,
   oOpcoes?: Parameters<APIRequestContext['post']>[1],
): Promise<APIResponse> {
   let oUltima: APIResponse | undefined;
   for (let n = 0; n < N_TENTATIVAS_PADRAO; n++) {
      oUltima = await request.post(cUrl, oOpcoes);
      if (oUltima.status() !== 429) {
         return oUltima;
      }
      await aguardarBackoff429(n);
   }
   return oUltima as APIResponse;
}