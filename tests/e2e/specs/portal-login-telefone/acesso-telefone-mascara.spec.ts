import {test, expect} from '../../fixtures';
import {
   C_TOKEN_OK,
   C_TOKEN_REVOGADO,
} from '../../helpers/portal/acessoPortalTokens';
import {mockarAcessoTelefone403} from '../../helpers/portal/mockAcessoTelefone';
import {AcessoPortalPage} from '../../pages/AcessoPortalPage';

test.describe('Portal — login telefone máscara IN-907', () => {
   test('CT-E2E-01 — Login com tronco 0 envia E.164 e redireciona', async ({
      page,
   }) => {
      const oAcesso = new AcessoPortalPage(page);
      await oAcesso.abrirLanding(C_TOKEN_OK);

      const {oReq, oRes} = await oAcesso.aguardarPostTelefone();
      await oAcesso.preencherTelefone('011999999999');
      await oAcesso.clicarAcessar();

      const oPost = await oReq;
      const oBody = oPost.postDataJSON() as {cTelefone?: string; cToken?: string};
      expect(oBody.cTelefone).toBe('5511999999999');
      expect(oBody.cToken).toBe(C_TOKEN_OK);
      expect((await oRes).status()).toBe(200);

      await oAcesso.expectRedirectOs(C_TOKEN_OK);
   });

   test('CT-E2E-03 — Backspace no DDD permite corrigir prefixo', async ({page}) => {
      const oAcesso = new AcessoPortalPage(page);
      await oAcesso.abrirLanding(C_TOKEN_OK);

      const cValorInicial = '(11) 999999999';
      await oAcesso.preencherTelefone('11999999999');
      await oAcesso.expectValorTelefone(cValorInicial);

      // Cursor após o DDD, sobre o fechamento ")" — CT-1 IN-913
      await oAcesso.posicionarCursorTelefone(4);
      await oAcesso.pressionarBackspaceTelefone();

      const cDepoisBackspace = await oAcesso.campoTelefone().inputValue();
      expect(cDepoisBackspace).not.toBe(cValorInicial);
      expect(cDepoisBackspace.replace(/\D/g, '').length).toBe(10);

      // Novo DDD 19 — campo continua editável
      await oAcesso.posicionarCursorTelefone(2);
      await oAcesso.campoTelefone().press('9');
      await oAcesso.expectValorTelefone('(19) 999999999');
   });

   test('CT-E2E-02 — Login sem tronco 0 redireciona', async ({page}) => {
      const oAcesso = new AcessoPortalPage(page);
      await oAcesso.abrirLanding(C_TOKEN_OK);

      const {oReq, oRes} = await oAcesso.aguardarPostTelefone();
      await oAcesso.preencherTelefone('11999999999');
      await oAcesso.clicarAcessar();

      const oPost = await oReq;
      const oBody = oPost.postDataJSON() as {cTelefone?: string};
      expect(oBody.cTelefone).toBe('5511999999999');
      expect((await oRes).status()).toBe(200);

      await oAcesso.expectRedirectOs(C_TOKEN_OK);
   });

   test('CT-E2E-04 — Acesso negado exibe alerta 403', async ({page}) => {
      await mockarAcessoTelefone403(page);
      const oAcesso = new AcessoPortalPage(page);
      await oAcesso.abrirLanding(C_TOKEN_OK);
      await oAcesso.preencherTelefone('11888887777');
      await oAcesso.clicarAcessar();
      await oAcesso.expectAlertaErro('Acesso não autorizado');
      await expect(page).toHaveURL(new RegExp(`/${C_TOKEN_OK}$`));
   });

   test('CT-E2E-05 — Link revogado 410 sem formulário', async ({page}) => {
      const oAcesso = new AcessoPortalPage(page);
      await page.goto(`/${C_TOKEN_REVOGADO}`);
      await oAcesso.expectLinkIndisponivel();
   });
});
