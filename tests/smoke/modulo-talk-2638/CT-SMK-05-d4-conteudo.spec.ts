import {expect, test} from '../../e2e/fixtures';
import {C_TOKEN_OK} from '../../e2e/helpers/portalFixtures';
import {evidenciarPassoSmokePreCr} from '../../e2e/helpers/pre-cr/evidenciarSmokePreCr';

const O_DETALHE_D4_CONTEUDO = {
  lSucesso: true,
  cMensagem: 'OK',
  oDados: {
    oOrdemServico: {
      cOsPublicId: C_TOKEN_OK,
      cNumeroOs: '001045',
      cStatusDescricao: 'Produção - Em andamento',
      oCliente: {cNome: 'Carlos', cSaudacao: 'Olá, Carlos'},
      cCondicoesTexto: 'IMPORTANTE:\n1 - Leia com atenção.',
      oBranding: {
        cLogoUrl: '/cliente-logo-placeholder.png',
        cNomeFantasia: 'Oficina E2E',
        cCnpj: '12.345.678/0001-99',
        cEndereco: 'Rua Teste, 100',
        cTelefone: '(11) 99999-0000',
      },
      oTokensDerivados: {'--theme-action-primary': '#1a5276'},
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
      mTimeline: [{cFase: 'P', cDescricao: 'Produção', lAtual: true, lConcluida: false}],
      mFotos: [],
      mAbasOrdem: ['checklist'],
    },
  },
};

test.describe('Smoke — conteúdo D4_v2 autenticado (TALK-2670)', () => {
  test('CT-SMK-05 — Saudação, condições e rodapé da oficina', async ({page, context}, testInfo) => {
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
        body: JSON.stringify(O_DETALHE_D4_CONTEUDO),
      });
    });

    await page.goto(`/os/${encodeURIComponent(C_TOKEN_OK)}`);
    await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();

    await expect(page.getByTestId('bloco-saudacao-os')).toContainText('Olá, Carlos');
    await expect(page.getByTestId('bloco-saudacao-os')).toContainText('Produção - Em andamento');
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-05', 1, 'saudacao-status');

    await expect(page.getByTestId('bloco-condicoes-os')).toContainText('IMPORTANTE');
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-05', 2, 'condicoes-comerciais');

    const oRodape = page.getByTestId('rodape-oficina-portal');
    await expect(oRodape).toContainText('Oficina E2E');
    await expect(oRodape).toContainText('12.345.678/0001-99');
    await expect(
      page.getByRole('link', {name: 'Criado por CERTTUS — abrir site da Certtus em nova aba'}),
    ).toBeVisible();
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-05', 3, 'rodape-assinatura');

    await expect(page.getByTestId('painel-evolucao-os')).toBeVisible();
    await evidenciarPassoSmokePreCr(page, testInfo, 'CT-SMK-05', 4, 'painel-evolucao-com-timeline');
  });
});
