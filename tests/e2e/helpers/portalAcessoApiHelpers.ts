import type {APIRequestContext} from '@playwright/test';
import {E2E_API_BASE_URL} from './env';
import {telefoneAutorizado} from './portalFixtures';

export async function obterCookiePortalSessao(
   request: APIRequestContext,
   cToken: string,
): Promise<string> {
   const oRes = await request.post(`${E2E_API_BASE_URL}/acesso/telefone`, {
      data: {
         cToken,
         cTelefone: telefoneAutorizado(),
      },
   });
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
