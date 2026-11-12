// pendente-irma:IN-949 — não entra na bateria que decide o PASSOU da IN-947 (HARNESS_MULTI_DEV_PR).
// Cobre o tema do portal que decide a logo do rodapé para o hop da IN-949.
import {expect, test} from '@playwright/test';
import {E2E_API_BASE_URL} from '../../e2e/helpers/env';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';
import {C_TOKEN_INEXISTENTE, respostaApiLer} from './loginD1Api';

const cUrlLanding = (cToken: string) => `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cToken)}`;

test.describe('API — irmã IN-949: tema do portal que decide a logo do rodapé (pendente-irma)', () => {
   test.beforeEach(async ({}, testInfo) => {
      testInfo.annotations.push({type: 'pendente-irma', description: 'IN-949'});
   });

   test('CT-API-12 — Landing de portal com tema claro entrega o tema do rodapé', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_OK);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-12', cUrl);
      expect(nStatus, cTexto).toBe(200);
      expect(oCorpo.lSucesso).toBe(true);
      const oDados = oCorpo.oDados as
         | {cTemaModo?: string; oTokensDerivados?: Record<string, string>}
         | undefined;
      expect([undefined, 'claro']).toContain(oDados?.cTemaModo);
      const mChaves = Object.keys(oDados?.oTokensDerivados ?? {});
      expect(mChaves.length).toBeGreaterThan(0);
      expect(mChaves.every((cChave) => cChave.startsWith('--'))).toBe(true);
   });

   test('CT-API-13 — Landing com token acima de 64 caracteres é rejeitada sem tema', async ({request}, testInfo) => {
      const cUrl = cUrlLanding('x'.repeat(65));
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-13', cUrl);
      expect(nStatus, cTexto).toBe(400);
      expect(oCorpo.lSucesso).toBe(false);
      expect(oCorpo.cMensagem).toBe('Token inválido.');
      expect(oCorpo.oDados).toBeUndefined();
   });

   test('CT-API-14 — Landing com token sem link cadastrado não entrega tema', async ({request}, testInfo) => {
      const cUrl = cUrlLanding(C_TOKEN_INEXISTENTE);
      const oRes = await request.get(cUrl);
      const {nStatus, cTexto, oCorpo} = await respostaApiLer(oRes, testInfo, 'CT-API-14', cUrl);
      expect(nStatus, cTexto).toBe(404);
      expect(oCorpo.lSucesso).toBe(false);
      const oDados = oCorpo.oDados as {oTokensDerivados?: unknown; cTemaModo?: unknown} | undefined;
      expect(oDados?.oTokensDerivados).toBeUndefined();
      expect(oDados?.cTemaModo).toBeUndefined();
   });
});
