import {expect, request as oPlaywrightRequest, test, type APIRequestContext} from '@playwright/test';
import {
   bancoFechar,
   celularE164,
   mensagensTalkDaOsCarregar,
   osDadosCarregar,
   tokenDaMensagemExtrair,
   type oMensagemTalk,
} from '../../e2e/helpers/portal/backofficeLinkBanco';
import {C_EMPRESA, C_SERIE, lChaveConfigurada, linkEmitir, linkRevogar} from '../../e2e/helpers/portal/backofficeLinkMs';
import {acessoTelefone, landingBff, osDetalhe} from '../../e2e/helpers/portal/portalBffAcesso';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';

/**
 * Bloco 5 — verificador da OS criada manualmente no BackOffice (rodar depois de cada CT manual).
 *
 * Env: PORTAL_BO_OS_BACKOFFICE=<OS> (obrigatória; sem ela os testes são pulados).
 *      PORTAL_BO_CELULAR_ANTERIOR=<dígitos do celular antigo> (CT-INT-02).
 *
 * SOMENTE LEITURA do banco (portaldocliente e talk) e do Portal. Exceção deliberada: os CT-INT-04 e
 * CT-INT-07 não têm mensagem de onde extrair o token e usam uma "sonda" no MS com o celular da OS:
 *    - 409 com oDados.cToken  => o link já existia (esperado no CT-INT-04);
 *    - 200 "emitido"          => NÃO existia (esperado no CT-INT-07 / CT-11) e a sonda o revoga na hora,
 *                                para não deixar link criado por ela.
 * Rode com --grep CT-INT-0x para escolher o cenário.
 */

const C_OS = (process.env.PORTAL_BO_OS_BACKOFFICE ?? '').trim();
const C_CELULAR_ANTERIOR = (process.env.PORTAL_BO_CELULAR_ANTERIOR ?? '').replace(/\D/g, '');

test.describe('Integração BackOffice -> Portal (URG-11817)', () => {
   test.skip(C_OS === '', 'PORTAL_BO_OS_BACKOFFICE não informada');

   let oReq: APIRequestContext;

   test.beforeAll(async () => {
      oReq = await oPlaywrightRequest.newContext();
   });

   test.afterAll(async () => {
      await oReq?.dispose();
      await bancoFechar();
   });

   async function osCarregar() {
      const oOs = await osDadosCarregar(C_EMPRESA, C_OS);
      expect(oOs, `OS ${C_OS} (empresa ${C_EMPRESA}, série ${C_SERIE}) não encontrada no banco`).not.toBeNull();
      return oOs!;
   }

   function tokenDe(mMsgs: oMensagemTalk[]): string {
      const cToken = tokenDaMensagemExtrair(mMsgs[mMsgs.length - 1].cBody);
      expect(cToken, 'token do link no corpo da mensagem').toBeTruthy();
      return cToken!;
   }

   /** Sonda: emite com o celular da OS. Se criou link novo, revoga logo em seguida. */
   async function sondar(cCelularE164: string): Promise<{lJaExistia: boolean; cToken: string; nStatus: number}> {
      const oR = await linkEmitir(oReq, {cOrdemServico: C_OS, cTelefone: cCelularE164});
      const cToken = String(oR.oBody?.oDados?.cToken ?? '');
      if (oR.nStatus === 200 && /emitido/i.test(String(oR.oBody?.cMensagem))) {
         await linkRevogar(oReq, {cOrdemServico: C_OS});
         return {lJaExistia: false, cToken, nStatus: oR.nStatus};
      }
      if (oR.nStatus === 200) {
         // 200 sem ser emissão nova (ex.: telefone atualizado): o link já existia, mas a sonda mexeu no celular.
         throw new Error(`sonda alterou link existente: ${oR.cTexto}`);
      }
      expect(oR.nStatus, oR.cTexto).toBe(409);
      return {lJaExistia: true, cToken, nStatus: oR.nStatus};
   }

   test('CT-INT-01 — Inclusão: uma mensagem com número e link; token abre e celular da OS acessa', async ({}, testInfo) => {
      const oOs = await osCarregar();
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs, 'deve haver exatamente uma mensagem para a OS').toHaveLength(1);
      expect(mMsgs[0].cBody).toContain(C_OS);
      const cToken = tokenDe(mMsgs);

      const oLanding = await landingBff(oReq, cToken);
      await evidenciarApiPreCr(testInfo, 'CT-INT-01', oLanding.nStatus, oLanding.cUrl, oLanding.cTexto);
      expect(oLanding.nStatus, oLanding.cTexto).toBe(200);

      const oAcesso = await acessoTelefone(oReq, cToken, celularE164(oOs.cCelular));
      expect(oAcesso.nStatus, oAcesso.cTexto).toBe(200);
      expect(oAcesso.lCookieSessao).toBe(true);
      const oDet = await osDetalhe(oReq, String(oAcesso.oBody.oDados.cOsPublicId));
      expect(oDet.nStatus, oDet.cTexto).toBe(200);
      expect(String(oDet.oBody.oDados.oOrdemServico.cNumeroOs).trim()).toBe(C_OS);
   });

   test('CT-INT-02 — Troca de celular: sem mensagem nova; mesmo token aceita o novo e recusa o antigo', async ({}, testInfo) => {
      expect(C_CELULAR_ANTERIOR, 'defina PORTAL_BO_CELULAR_ANTERIOR (dígitos)').not.toBe('');
      const oOs = await osCarregar();
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs, 'a troca de celular não deve gerar mensagem nova (só a da inclusão)').toHaveLength(1);
      const cToken = tokenDe(mMsgs);

      const oNovo = await acessoTelefone(oReq, cToken, celularE164(oOs.cCelular));
      await evidenciarApiPreCr(testInfo, 'CT-INT-02', oNovo.nStatus, oNovo.cUrl, oNovo.cTexto);
      expect(oNovo.nStatus, oNovo.cTexto).toBe(200);

      const oCtxAntigo = await oPlaywrightRequest.newContext();
      const oAntigo = await acessoTelefone(oCtxAntigo, cToken, celularE164(C_CELULAR_ANTERIOR));
      await oCtxAntigo.dispose();
      expect(oAntigo.nStatus, oAntigo.cTexto).toBeGreaterThanOrEqual(400);
      expect(oAntigo.lCookieSessao).toBe(false);
   });

   test('CT-INT-03 — Cancelamento: landing 410 e acesso recusado', async ({}, testInfo) => {
      const oOs = await osCarregar();
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs.length, 'a OS precisa ter tido mensagem com o link').toBeGreaterThanOrEqual(1);
      const cToken = tokenDe(mMsgs);

      const oLanding = await landingBff(oReq, cToken);
      await evidenciarApiPreCr(testInfo, 'CT-INT-03', oLanding.nStatus, oLanding.cUrl, oLanding.cTexto);
      expect(oLanding.nStatus, oLanding.cTexto).toBe(410);

      const oAcesso = await acessoTelefone(oReq, cToken, celularE164(oOs.cCelular));
      expect(oAcesso.nStatus, oAcesso.cTexto).toBeGreaterThanOrEqual(400);
      expect(oAcesso.lCookieSessao).toBe(false);
   });

   test('CT-INT-04 — Envio desligado: sem mensagem, mas o link existe e o celular da OS acessa', async ({}, testInfo) => {
      const oOs = await osCarregar();
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs, 'com o envio desligado não deve haver mensagem').toHaveLength(0);

      const oSonda = await sondar(celularE164(oOs.cCelular));
      testInfo.annotations.push({type: 'sonda', description: `HTTP ${oSonda.nStatus} link já existia=${oSonda.lJaExistia}`});
      expect(oSonda.lJaExistia, 'o link deve existir mesmo sem mensagem').toBe(true);
      expect(oSonda.cToken).toBeTruthy();

      const oAcesso = await acessoTelefone(oReq, oSonda.cToken, celularE164(oOs.cCelular));
      await evidenciarApiPreCr(testInfo, 'CT-INT-04', oAcesso.nStatus, oAcesso.cUrl, oAcesso.cTexto);
      expect(oAcesso.nStatus, oAcesso.cTexto).toBe(200);
   });

   test('CT-INT-05 — Mensagem sem <LinkPortal>: o link aparece uma única vez, na linha seguinte ao texto', async ({}, testInfo) => {
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs.length, 'deve haver mensagem para a OS').toBeGreaterThanOrEqual(1);
      const cBody = mMsgs[mMsgs.length - 1].cBody;
      await evidenciarApiPreCr(testInfo, 'CT-INT-05', 200, 'talk:Messages', JSON.stringify({body: cBody}));
      const mLinks: string[] = cBody.match(/https?:\/\/\S+/g) ?? [];
      expect(mLinks, 'o link deve aparecer uma única vez').toHaveLength(1);
      const mLinhas = cBody.split(/\r?\n/).map((c) => c.trim());
      const nLinhaLink = mLinhas.findIndex((c) => c.includes(mLinks[0]));
      expect(nLinhaLink, 'o link deve estar em linha própria depois do texto').toBeGreaterThan(0);
      expect(mLinhas[nLinhaLink]).toBe(mLinks[0]);
      expect(mLinhas.slice(0, nLinhaLink).join('').trim(), 'deve haver texto antes do link').not.toBe('');
   });

   test('CT-INT-06 — Mensagem normal / outro celular / sem mensagem nova (inspeção)', async ({}, testInfo) => {
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      const oOs = await osCarregar();
      testInfo.annotations.push({
         type: 'mensagens',
         description: `${mMsgs.length} mensagem(ns) para a OS ${C_OS}; celular da OS ${oOs.cCelular}`,
      });
      expect(mMsgs.length, 'deve haver pelo menos uma mensagem para a OS').toBeGreaterThanOrEqual(1);
      const cToken = tokenDe(mMsgs);
      expect(mMsgs[mMsgs.length - 1].cBody).toContain(C_OS);
      const oLanding = await landingBff(oReq, cToken);
      await evidenciarApiPreCr(testInfo, 'CT-INT-06', oLanding.nStatus, oLanding.cUrl, oLanding.cTexto);
      // CT-10: o link continua valendo.
      expect(oLanding.nStatus, oLanding.cTexto).toBe(200);
   });

   test('CT-INT-07 — Sem mensagem e sem link (CT-11): landing sem token', async ({}, testInfo) => {
      const oOs = await osCarregar();
      const mMsgs = await mensagensTalkDaOsCarregar(C_OS);
      expect(mMsgs, 'não deve haver mensagem para a OS').toHaveLength(0);

      const oSonda = await sondar(celularE164(oOs.cCelular));
      testInfo.annotations.push({type: 'sonda', description: `HTTP ${oSonda.nStatus} link já existia=${oSonda.lJaExistia}`});
      await evidenciarApiPreCr(testInfo, 'CT-INT-07', oSonda.nStatus, 'ms:portal/link', JSON.stringify({lJaExistia: oSonda.lJaExistia}));
      expect(oSonda.lJaExistia, 'nenhum link deveria existir para a OS').toBe(false);
   });
});
