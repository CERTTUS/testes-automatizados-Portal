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
