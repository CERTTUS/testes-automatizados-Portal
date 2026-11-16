import type {APIRequestContext} from '@playwright/test';
import {E2E_API_BASE_URL} from './env';
import {requisicaoPostComRetry429} from './portal/bffHomologRetry';
import {lHomologPortal} from './portal/massaPortal2881';
import {telefoneAutorizado} from './portalFixtures';

export async function obterCookiePortalSessao(
   request: APIRequestContext,
   cToken: string,
): Promise<string> {
   const cUrl = `${E2E_API_BASE_URL}/acesso/telefone`;
   const oCorpoPost = {
      data: {
         cToken,
         cTelefone: telefoneAutorizado(),
      },
   };
   const oRes = lHomologPortal()
      ? await requisicaoPostComRetry429(request, cUrl, oCorpoPost)
      : await request.post(cUrl, oCorpoPost);
   const cCorpo = await oRes.text();
   if (oRes.status() !== 200) {
      throw new Error(`POST /acesso/telefone falhou ${oRes.status()}: ${cCorpo}`);
   }
   const mSetCookie = oRes.headers()['set-cookie'];
   const cRaw = Array.isArray(mSetCookie) ? mSetCookie.join('; ') : mSetCookie ?? '';
   const oMatch = /portal_sessao=([^;]+)/.exec(cRaw);
   if (!oMatch?.[1]) {
      throw new Error('Set-Cookie portal_sessao ausente na resposta de acesso');
   }
   return `portal_sessao=${oMatch[1]}`;
}
