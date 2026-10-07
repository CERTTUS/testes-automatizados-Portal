import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';

const O_DETALHE_SEM_TIMELINE = {
  lSucesso: true,
  cMensagem: 'OK',
  oDados: {
    oOrdemServico: {
      cOsPublicId: C_TOKEN_OK,
      cNumeroOs: '001046',
      cStatusDescricao: 'Aguardando peças',
      oCliente: {cNome: 'Maria', cSaudacao: 'Olá, Maria'},
      oBranding: {
        cLogoUrl: '/cliente-logo-placeholder.png',
        cNomeFantasia: 'Oficina E2E',
      },
      oVeiculo: {
        cPlaca: 'XYZ9E99',
        cMarca: 'FIAT',
        cModelo: 'Argo',
        cAno: '2022',
      },
      mCarretas: [],
      lRetifica: false,
      lTemMotor: false,
      mChecklist: [],
      mServicos: [],
      mPecas: [],
      mTimeline: [],
      mFotos: [],
      mAbasOrdem: ['checklist', 'servicos'],
    },
  },
};

test.describe('Smoke — painel sem timeline (TALK-2671 / FR-016)', () => {
  test('CT-SMK-06 — Relatório sem coluna Evolução', async ({page, context}, testInfo) => {
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
        body: JSON.stringify(O_DETALHE_SEM_TIMELINE),
      });
    });

    await page.goto(`/os/${encodeURIComponent(C_TOKEN_OK)}`);
    await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
    await expect(page.getByTestId('painel-detalhe-os')).toBeVisible();
    await expect(page.getByText('Relatório de Serviço')).toBeVisible();
    await expect(page.getByTestId('painel-evolucao-os')).toHaveCount(0);
    await expect(page.getByRole('tab', {name: 'Evolução da OS'})).toHaveCount(0);
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-06', 1, 'relatorio-sem-evolucao');
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-06', 2, 'layout-single-column');
  });
});
