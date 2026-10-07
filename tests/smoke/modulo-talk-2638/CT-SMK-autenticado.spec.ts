import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';

const O_DETALHE_MINIMO = {
  lSucesso: true,
  cMensagem: 'OK',
  oDados: {
    oOrdemServico: {
      cOsPublicId: C_TOKEN_OK,
      cNumeroOs: '001045',
      cStatusDescricao: 'Em andamento',
      oBranding: {
        cNomeFantasia: 'Oficina E2E',
        cLogoUrl: '/cliente-logo-placeholder.png',
      },
      oTokensDerivados: {
        '--theme-action-primary': '#1a5276',
      },
      oVeiculo: {
        cPlaca: 'ABC1D23',
        cMarca: 'VW',
        cModelo: 'Modelo E2E',
        cAno: '2019',
      },
      mCarretas: [],
      lRetifica: false,
      lTemMotor: false,
      mChecklist: [],
      mServicos: [],
      mPecas: [],
      mTimeline: [],
      mFotos: [],
      mAbasOrdem: ['checklist'],
    },
  },
};

test.describe('Smoke — shell autenticado (TALK-2669)', () => {
  test('CT-SMK-04 — Shell autenticado com menu', async ({page, context}, testInfo) => {
    await context.addCookies([
      {
        name: 'portal_sessao',
        value: 'e2e-sessao',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/bff/cliente/os/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(O_DETALHE_MINIMO),
      });
    });

    await page.goto(`/os/${encodeURIComponent(C_TOKEN_OK)}`);
    await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-04', 1, 'shell-autenticado');

    const oMenu = page.getByTestId('menu-topo-portal');
    await expect(oMenu).toBeVisible();
    await expect(page.getByTestId('nav-topo-marca')).toContainText('Oficina E2E');
    await expect(page.getByTestId('nav-ordem-servico')).toBeVisible();
    await expect(page.getByTestId('nav-boleto')).toBeVisible();
    await expect(page.getByTestId('btn-sair-portal')).toBeVisible();
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-04', 2, 'menu-os-boleto-sair');
  });
});
