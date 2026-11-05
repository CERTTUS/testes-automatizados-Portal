import type {APIRequestContext} from '@playwright/test';
import {expect, test} from '../../fixtures';
import {
   C_FIXTURE_FAVICON_ADICIONAR,
   C_FIXTURE_FAVICON_ALTERAR,
   C_FIXTURE_LOGO_ADICIONAR,
   C_FIXTURE_LOGO_ALTERAR,
} from '../../helpers/portal/massaPortal2881';
import {imagensTalkFotografar} from '../../helpers/portal/talkPortalConfigApi';
import {TalkPortalClientePage} from '../../pages/TalkPortalClientePage';

test.describe('E2E — Talk Aparência imagens Portal (TALK-2881)', () => {
   test.describe.configure({mode: 'serial'});

   /* Homolog: favicon e logo da empresa voltam ao que eram antes dos envios. */
   let oCtxMassa: APIRequestContext | undefined;
   let oImagens: {restaurar: () => Promise<void>} | undefined;

   test.beforeAll(async ({playwright}) => {
      oCtxMassa = await playwright.request.newContext();
      oImagens = await imagensTalkFotografar(oCtxMassa);
   });

   test.afterAll(async () => {
      try {
         await oImagens?.restaurar();
      } finally {
         await oCtxMassa?.dispose();
      }
   });

   test('CT-E2E-08 — Prévia na Aparência do Talk com upload e histórico', async ({
      page,
   }) => {
      const talk = new TalkPortalClientePage(page);
      await talk.autenticarSeNecessario();
      await talk.abrirAparencia();
      await expect(talk.inputFavicon()).toBeAttached();
      await talk.enviarImagemERecortar(
         talk.inputFavicon(),
         C_FIXTURE_FAVICON_ALTERAR,
         'Ajustar favicon',
      );
      await talk.abrirConteudo();
      await expect(talk.historicoExibir()).toBeVisible();
      await expect(talk.preview()).toBeVisible();
      await talk.gravarConfiguracao();
   });

   test('CT-E2E-15 — Adicionar favicon na Aparência do Talk', async ({page}) => {
      const talk = new TalkPortalClientePage(page);
      await talk.autenticarSeNecessario();
      await talk.abrirAparencia();
      await talk.enviarImagemERecortar(
         talk.inputFavicon(),
         C_FIXTURE_FAVICON_ADICIONAR,
         'Ajustar favicon',
      );
      await talk.gravarConfiguracao();
      await expect(talk.faviconPadrao()).toHaveCount(0);
      await expect(talk.preview()).toBeVisible();
   });

   test('CT-E2E-16 — Alterar favicon na Aparência do Talk', async ({page}) => {
      const talk = new TalkPortalClientePage(page);
      await talk.autenticarSeNecessario();
      await talk.abrirAparencia();
      await expect(talk.faviconPadrao()).toHaveCount(0);
      await talk.enviarImagemERecortar(
         talk.inputFavicon(),
         C_FIXTURE_FAVICON_ALTERAR,
         'Ajustar favicon',
      );
      await talk.gravarConfiguracao();
      await expect(talk.preview()).toBeVisible();
   });

   test('CT-E2E-17 — Adicionar logo na Aparência do Talk', async ({page}) => {
      const talk = new TalkPortalClientePage(page);
      await talk.autenticarSeNecessario();
      await talk.abrirAparencia();
      await talk.enviarImagemERecortar(
         talk.inputLogo(),
         C_FIXTURE_LOGO_ADICIONAR,
         'Ajustar logo',
      );
      await talk.gravarConfiguracao();
      await expect(talk.preview()).toBeVisible();
   });

   test('CT-E2E-18 — Alterar logo na Aparência do Talk', async ({page}) => {
      const talk = new TalkPortalClientePage(page);
      await talk.autenticarSeNecessario();
      await talk.abrirAparencia();
      await talk.enviarImagemERecortar(
         talk.inputLogo(),
         C_FIXTURE_LOGO_ALTERAR,
         'Ajustar logo',
      );
      await talk.gravarConfiguracao();
      await expect(talk.preview()).toBeVisible();
   });
});
