import {expect, request as oPlaywrightRequest, test, type APIRequestContext} from '@playwright/test';
import {bancoFechar, osConsolidacaoCarregar, osMassaCarregar} from '../../e2e/helpers/portal/backofficeLinkBanco';
import {
   C_TELEFONE_A,
   C_TELEFONE_B,
   lChaveConfigurada,
   linkEmitir,
   linkRevogar,
   type oRespostaMs,
} from '../../e2e/helpers/portal/backofficeLinkMs';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

/**
 * Blocos 1 e 2 — contrato BackOffice -> microsserviço (emitir, reemitir, trocar celular, revogar) e erros.
 * Usa a OS de massa (PORTAL_BO_OS_MASSA ou a escolhida pelo banco). Serial: os CTs dependem uns dos outros.
 */
test.describe.configure({mode: 'serial'});

test.describe('API — contrato BackOffice -> MS (URG-11817)', () => {
   test.skip(!lChaveConfigurada(), 'PORTAL_BO_MS_CHAVEAPI não configurada no .env.local');

   let oReq: APIRequestContext;
   let cOs = '';
   let cTokenA = '';
   let cTokenRevogado = '';

   test.beforeAll(async () => {
      oReq = await oPlaywrightRequest.newContext();
      cOs = await osMassaCarregar();
      expect(cOs, 'OS de massa não encontrada no banco').not.toBe('');
      const oRev = await linkRevogar(oReq, {cOrdemServico: cOs});
      expect([200, 404], `limpeza da OS de massa: ${oRev.cTexto}`).toContain(oRev.nStatus);
   });

   test.afterAll(async () => {
      // Deixa as OS usadas sem link ativo (só a massa e a consolidação desta suíte).
      if (oReq && cOs) {
         await linkRevogar(oReq, {cOrdemServico: cOs}).catch(() => undefined);
         const cOsConsolidacao = await osConsolidacaoCarregar().catch(() => '');
         if (cOsConsolidacao) {
            await linkRevogar(oReq, {cOrdemServico: cOsConsolidacao, cEmpresa: '0001'}).catch(() => undefined);
         }
      }
      await oReq?.dispose();
      await bancoFechar();
   });

   async function evidencia(oInfo: Parameters<typeof evidenciarApiPreCr>[0], cId: string, oR: oRespostaMs) {
      await evidenciarApiPreCr(oInfo, cId, oR.nStatus, oR.cUrl, oR.cTexto);
   }

   test('CT-API-01 — Emitir link', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A});
      await evidencia(testInfo, 'CT-API-01', oR);
      expect(oR.nStatus, oR.cTexto).toBe(200);
      expect(oR.oBody.lSucesso).toBe(true);
      expect(oR.oBody.oDados.cToken).toBeTruthy();
      expect(oR.oBody.oDados.lHashAtualizado).toBe(false);
      cTokenA = oR.oBody.oDados.cToken;
   });

   test('CT-API-02 — Reemitir igual', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A});
      await evidencia(testInfo, 'CT-API-02', oR);
      testInfo.annotations.push({type: 'status-real', description: `HTTP ${oR.nStatus}`});
      expect([200, 409], oR.cTexto).toContain(oR.nStatus);
      expect(oR.oBody.oDados?.cToken).toBe(cTokenA);
   });

   test('CT-API-03 — Troca de celular', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_B});
      await evidencia(testInfo, 'CT-API-03', oR);
      expect(oR.nStatus, oR.cTexto).toBe(200);
      expect(oR.oBody.oDados.lHashAtualizado).toBe(true);
      expect(oR.oBody.oDados.cToken).toBe(cTokenA);
   });

   test('CT-API-04 — Revogar', async ({}, testInfo) => {
      const oR = await linkRevogar(oReq, {cOrdemServico: cOs});
      await evidencia(testInfo, 'CT-API-04', oR);
      expect(oR.nStatus, oR.cTexto).toBe(200);
      cTokenRevogado = cTokenA;
   });

   test('CT-API-05 — Revogar sem link ativo', async ({}, testInfo) => {
      const oR = await linkRevogar(oReq, {cOrdemServico: cOs});
      await evidencia(testInfo, 'CT-API-05', oR);
      testInfo.annotations.push({type: 'status-real', description: `HTTP ${oR.nStatus}`});
      expect([200, 404], oR.cTexto).toContain(oR.nStatus);
   });

   test('CT-API-06 — Emitir depois de revogar', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A});
      await evidencia(testInfo, 'CT-API-06', oR);
      expect(oR.nStatus, oR.cTexto).toBe(200);
      expect(oR.oBody.oDados.cToken).toBeTruthy();
      expect(oR.oBody.oDados.cToken).not.toBe(cTokenRevogado);
   });

   test('CT-API-07 — Consolidação de produção (OS da filial 0002 com cEmpresa 0001)', async ({}, testInfo) => {
      const cOsConsolidacao = await osConsolidacaoCarregar();
      expect(cOsConsolidacao, 'OS da filial 0002 não encontrada no banco').not.toBe('');
      const oR = await linkEmitir(oReq, {cOrdemServico: cOsConsolidacao, cEmpresa: '0001', cTelefone: C_TELEFONE_A});
      await evidencia(testInfo, 'CT-API-07', oR);
      expect(oR.nStatus, oR.cTexto).toBe(200);
      expect(oR.oBody.oDados.cToken).toBeTruthy();
   });

   test('CT-API-08 — Emitir sem cTelefone', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs});
      await evidencia(testInfo, 'CT-API-08', oR);
      expect(oR.nStatus, oR.cTexto).toBe(400);
      expect(oR.oBody.lSucesso).toBe(false);
      expect(typeof oR.oBody.cMensagem).toBe('string');
   });

   test('CT-API-09 — Chave inválida (40 caracteres)', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A, cChave: '0'.repeat(40)});
      await evidencia(testInfo, 'CT-API-09', oR);
      expect(oR.nStatus, oR.cTexto).toBe(401);
      expect(oR.oBody.erro).toBe(true);
      expect(typeof oR.oBody.mensagem).toBe('string');
   });

   test('CT-API-10 — Tenant inexistente', async ({}, testInfo) => {
      const oR = await linkEmitir(oReq, {cOrdemServico: cOs, cTelefone: C_TELEFONE_A, cDatabase: 'NAOEXISTE'});
      await evidencia(testInfo, 'CT-API-10', oR);
      expect(oR.nStatus, oR.cTexto).toBe(403);
      expect(oR.oBody.erro).toBe(true);
      expect(oR.oBody.mensagem).toBe('Tenant não autorizado ou inexistente.');
   });

   test('CT-API-11 — Revogar sem cOrdemServico', async ({}, testInfo) => {
      const oR = await linkRevogar(oReq, {});
      await evidencia(testInfo, 'CT-API-11', oR);
      expect(oR.nStatus, oR.cTexto).toBe(400);
      expect(oR.oBody.lSucesso).toBe(false);
      expect(typeof oR.oBody.cMensagem).toBe('string');
   });
});
