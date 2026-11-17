import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_TEXTO_PERSONALIZADO} from '../../api/modulo-talk-3103-cor-texto-elementos/corTextoElementosApi';
import {landingCorTextoAguardar} from '../../e2e/helpers/portal/corTextoElementosHelpers';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';
import {aplicarTemaT3103Homolog} from '../../e2e/helpers/portal/massaCorTextoT3103Homolog';

test.describe('Smoke — cor de texto na landing (TALK-3103)', () => {
   test.describe.configure({mode: 'serial'});
   test.beforeAll(async ({request}) => {
      await aplicarTemaT3103Homolog(request, 'personalizado', C_TOKEN_TEXTO_PERSONALIZADO);
   });

   test('CT-SMK-01 — Landing aplica variáveis de texto no wrapper', async ({page}, testInfo) => {
      await landingCorTextoAguardar(page, C_TOKEN_TEXTO_PERSONALIZADO);
      await expect(page.getByRole('button', {name: 'Acessar'})).toBeVisible();
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-01', 1, 'formulario-acesso');

      const oTema = page.getByTestId('tema-portal-aplicar');
      await expect(oTema).toBeVisible();
      await expect(oTema).toHaveCSS('--portal-login-texto', '#7a2e00');
      await expect(oTema).toHaveCSS('--portal-login-botao-texto', '#ffe8cc');
      await expect(oTema).toHaveCSS('--portal-os-header-texto', '#ffd166');
      await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-01', 2, 'variaveis-texto-tema');
   });
});