import type {APIRequestContext} from '@playwright/test';
import {E2E_API_BASE_URL} from './env';

/** Helpers HTTP compartilhados — expandir na 1ª Dev conforme endpoints do Portal. */

export async function healthCheckApi(request: APIRequestContext): Promise<number> {
   const oRes = await request.get(`${E2E_API_BASE_URL}/health`);
   return oRes.status();
}
