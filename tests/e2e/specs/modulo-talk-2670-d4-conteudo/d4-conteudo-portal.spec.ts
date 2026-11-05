import {expect, test} from '../../fixtures';
import {C_TOKEN_OK} from '../../helpers/portalFixtures';
import {
   abrirDetalheOsAutenticadoMock,
   cookieSessaoPortalE2e,
   mockarDetalheOsFalhaHttp,
} from '../../helpers/portal/d4ConteudoHelpers';
import {
   detalheOsConteudoCompleto,
   detalheOsFailOpenSemSaudacaoCondicoes,
   detalheOsSubtituloPorTimeline,
} from '../../helpers/portal/d4ConteudoMocks';

test.describe('E2E — conteúdo D4_v2 detalhe OS (TALK-2670)', () => {
   test('CT-E2E-01 — Detalhe OS: saudação, condições e rodapé completos', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsConteudoCompleto(),
      );

      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toBeVisible();

      const oSaudacao = page.getByTestId('bloco-saudacao-os');
      await expect(oSaudacao).toContainText('Olá, Carlos');
      await expect(oSaudacao).toContainText('Produção - Em andamento');

      const oCondicoes = page.getByTestId('bloco-condicoes-os');
      await expect(oCondicoes.getByRole('heading', {name: 'Condições comerciais'})).toBeVisible();
      await expect(oCondicoes).toContainText('IMPORTANTE');
      await expect(oCondicoes).toContainText('1 - Leia com atenção.');

      const oRodape = page.getByTestId('rodape-oficina-portal');
      await expect(oRodape).toContainText('Oficina E2E');
      await expect(oRodape).toContainText('12.345.678/0001-99');
      await expect(oRodape).toContainText('Rua Teste, 100');
      await expect(oRodape).toContainText('(11) 99999-0000');
      await expect(
         page.getByRole('link', {
            name: 'Criado por CERTTUS — abrir site da Certtus em nova aba',
         }),
      ).toBeVisible();
   });

   test('CT-E2E-02 — Fail-open sem saudação e sem condições comerciais', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsFailOpenSemSaudacaoCondicoes(),
      );

      await expect(page.getByTestId('layout-portal-autenticado')).toBeVisible();
      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toBeVisible();
      await expect(page.getByTestId('bloco-saudacao-os')).toHaveCount(0);
      await expect(page.getByTestId('bloco-condicoes-os')).toHaveCount(0);

      const oRodape = page.getByTestId('rodape-oficina-portal');
      await expect(oRodape).toBeVisible();
      await expect(
         page.getByRole('link', {
            name: 'Criado por CERTTUS — abrir site da Certtus em nova aba',
         }),
      ).toBeVisible();
   });

   test('CT-E2E-03 — Subtítulo da saudação pela fase atual da timeline', async ({
      page,
      context,
   }) => {
      await abrirDetalheOsAutenticadoMock(
         page,
         context,
         detalheOsSubtituloPorTimeline(),
      );

      const oSaudacao = page.getByTestId('bloco-saudacao-os');
      await expect(oSaudacao).toContainText('Olá, Ana');
      await expect(oSaudacao).toContainText('Aguardando peças');
      await expect(oSaudacao).not.toContainText('Produção - Em andamento');
   });

   test('CT-E2E-04 — Erro ou indisponibilidade do BFF no detalhe da OS', async ({
      page,
      context,
   }) => {
      await cookieSessaoPortalE2e(context);
      await mockarDetalheOsFalhaHttp(page, 500);
      await page.goto(`/os/${encodeURIComponent(C_TOKEN_OK)}`);

      await expect(page.getByTestId('conteudo-detalhe-os-autenticado')).toHaveCount(0);
      await expect(page.getByTestId('bloco-saudacao-os')).toHaveCount(0);
      await expect(page.getByTestId('bloco-condicoes-os')).toHaveCount(0);
      await expect(page.getByTestId('rodape-oficina-portal')).toHaveCount(0);
      await expect(page.getByTestId('mensagem-erro-detalhe-os-autenticado')).toBeVisible();
      await expect(page.getByTestId('mensagem-erro-detalhe-os-autenticado')).toContainText(
         /Não foi possível (carregar o detalhe|concluir a solicitação)/i,
      );
   });
});
