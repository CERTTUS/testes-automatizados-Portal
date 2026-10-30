import {expect, test, type APIRequestContext, type APIResponse} from '@playwright/test';
import type {TestInfo} from '@playwright/test';
import {evidenciarApiPreCr} from '../../e2e/helpers/pre-cr/evidenciarApiPreCr';
import {E2E_API_BASE_URL, E2E_BASE_URL} from '../../e2e/helpers/env';
import {lHomologPortal} from '../../e2e/helpers/portal/massaPortal2881';
import {pularSeNaoAplicavel} from '../../e2e/helpers/pularSeNaoAplicavel';
import {
   C_FASES_HISTORICO_TODAS,
   massaFaviconSemCampoPreparar,
   massaHistoricoHomologPreparar,
   massaSoLogoPreparar,
   type oMassaHistoricoHomolog,
} from '../../e2e/helpers/portal/talkPortalConfigApi';
import {
   C_FAVICON_URL,
   C_LOGO_URL,
   C_NOME_OFICINA,
   C_TOKEN_ALVO_NEGADO,
   C_TOKEN_ALVO_OK,
   C_TOKEN_INEXISTENTE,
   C_TOKEN_LINK_FAVICON,
   C_TOKEN_LINK_LOGO,
   C_TOKEN_LINK_SEM_FAVICON,
   C_TOKEN_SESSAO,
   C_TOKEN_SESSAO_422,
   C_UA_WHATSAPP,
   linksIcone,
   metaConteudo,
   sessaoCriar,
   sessaoWebCriar,
   stubRequisicoesLimpar,
   stubRequisicoesObter,
   tituloHtml,
   tokenPreviewSemCampo,
   tokenPreviewValido,
   tokenRevogadoPreview,
   tokenSessaoPortal,
   type oRequisicaoStub,
} from './portalStackHelper';

const C_MOTIVO_LOGO_ERP_HOMOLOG =
   'Pré-condição de massa: homolog empresa 0001 tem logotipo ERP via logoCarregar; sem favicon e sem logo do Portal não cai na marca CERTTUS.';

type oItemHistorico = {cOsPublicId: string; cStatus: string};

const C_MARCA_SUFIXO = '/marca/certtus-marca.png';
const C_MENSAGEM_403 = 'Acesso não autorizado';

async function oResposta(
   oRes: APIResponse,
   testInfo: TestInfo,
   cCtId: string,
): Promise<{nStatus: number; cUrl: string; cTextoCorpo: string}> {
   const nStatus = oRes.status();
   const cUrl = oRes.url();
   const cTextoCorpo = await oRes.text();
   await evidenciarApiPreCr(testInfo, cCtId, nStatus, cUrl, cTextoCorpo);
   return {nStatus, cUrl, cTextoCorpo};
}

function oJson(cTexto: string): Record<string, unknown> {
   return JSON.parse(cTexto) as Record<string, unknown>;
}

function mReqsPorTrecho(mReqs: oRequisicaoStub[], cTrecho: string): oRequisicaoStub[] {
   return mReqs.filter(
      (oReq) => oReq.cPath.includes(cTrecho) && !oReq.cPath.includes('/validar-acesso'),
   );
}

function lMarcaCerttus(cUrl: string | null): boolean {
   return Boolean(cUrl?.startsWith('http') && cUrl.endsWith(C_MARCA_SUFIXO));
}

async function htmlTokenObter(
   request: APIRequestContext,
   cToken: string,
   testInfo: TestInfo,
   cCtId: string,
): Promise<{nStatus: number; cUrl: string; cHtml: string}> {
   const oRes = await request.get(`${E2E_BASE_URL}/${cToken}`, {
      headers: {'user-agent': C_UA_WHATSAPP},
   });
   const {nStatus, cUrl, cTextoCorpo} = await oResposta(oRes, testInfo, cCtId);
   return {nStatus, cUrl, cHtml: cTextoCorpo};
}

async function comSessaoWeb(
   playwrightRequest: typeof import('@playwright/test').request,
   cToken: string,
   fExecutar: (oSessao: APIRequestContext) => Promise<void>,
): Promise<void> {
   const oSessao = await sessaoWebCriar(playwrightRequest, cToken);
   try {
      await fExecutar(oSessao);
   } finally {
      await oSessao.dispose();
   }
}

async function comSessaoBff(
   playwrightRequest: typeof import('@playwright/test').request,
   request: APIRequestContext,
   cToken: string,
   fExecutar: (oSessao: APIRequestContext) => Promise<void>,
): Promise<void> {
   const oSessao = await sessaoCriar(playwrightRequest, cToken);
   try {
      await stubRequisicoesLimpar(request);
      await fExecutar(oSessao);
   } finally {
      await oSessao.dispose();
   }
}

test.describe('API — Portal favicon, histórico e menu (TALK-2881)', () => {
   test.describe.configure({mode: 'serial'});

   test('CT-API-01 — Preview do link mostra nome, descrição e imagem da oficina', async ({
      request,
   }, testInfo) => {
      const cToken = tokenPreviewValido();
      const {nStatus, cHtml} = await htmlTokenObter(request, cToken, testInfo, 'CT-API-01');
      const cOgUrl = metaConteudo(cHtml, 'property', 'og:url');
      const cTitulo = tituloHtml(cHtml);
      expect(nStatus, 'GET /{token} do preview deve responder 200').toBe(200);
      expect(cTitulo, 'título deve identificar a oficina').toMatch(/^.+ \| Portal do Cliente$/);
      const cNome = (cTitulo ?? '').replace(/ \| Portal do Cliente$/, '');
      expect(cNome, 'nome da oficina no título').not.toBe('');
      expect(cNome).not.toBe('Portal do Cliente');
      expect(metaConteudo(cHtml, 'property', 'og:title')).toBe(cTitulo);
      expect(metaConteudo(cHtml, 'property', 'og:description')).toBe(
         `Acompanhe sua ordem de serviço em ${cNome}`,
      );
      const cOgImage = metaConteudo(cHtml, 'property', 'og:image');
      expect(cOgImage, 'og:image absoluto').toMatch(/^https?:\/\//);
      expect(cOgImage, 'og:image não usa favicon.ico padrão').not.toContain('favicon.ico');
      if (!lHomologPortal()) {
         expect(cOgImage).toBe(C_FAVICON_URL);
         expect(cNome).toBe(C_NOME_OFICINA);
      }
      expect(cOgUrl).toMatch(/^http/);
      expect(cOgUrl?.endsWith(`/${cToken}`), 'og:url absoluto do token').toBe(true);
      expect(metaConteudo(cHtml, 'property', 'og:site_name')).toBe(cNome);
      expect(metaConteudo(cHtml, 'property', 'og:type')).toBe('website');
      expect(metaConteudo(cHtml, 'property', 'og:locale')).toBe('pt_BR');
      expect(metaConteudo(cHtml, 'name', 'twitter:card')).toBe('summary');
   });

   test('CT-API-02 — Aba do navegador usa o ícone da oficina e nunca o favicon.ico padrão', async ({
      request,
   }, testInfo) => {
      const {cHtml} = await htmlTokenObter(request, tokenPreviewValido(), testInfo, 'CT-API-02');
      const mIcones = linksIcone(cHtml);
      expect(mIcones.length, 'documento deve expor links de ícone').toBeGreaterThan(0);
      if (lHomologPortal()) {
         expect(mIcones.some((cHref) => /^https?:\/\//.test(cHref))).toBe(true);
      } else {
         expect(mIcones.some((cHref) => cHref === C_FAVICON_URL)).toBe(true);
      }
      expect(mIcones.every((cHref) => !cHref.includes('/favicon.ico'))).toBe(true);
      expect(cHtml).not.toContain('/favicon.ico');
   });

   test('CT-API-03 — Oficina sem favicon e sem logo usa a marca CERTTUS em URL absoluta', async ({
      request,
   }, testInfo) => {
      pularSeNaoAplicavel(!lHomologPortal(), C_MOTIVO_LOGO_ERP_HOMOLOG);
      const {cHtml} = await htmlTokenObter(
         request,
         C_TOKEN_LINK_SEM_FAVICON,
         testInfo,
         'CT-API-03',
      );
      const cOgImage = metaConteudo(cHtml, 'property', 'og:image');
      expect(lMarcaCerttus(cOgImage)).toBe(true);
      expect(linksIcone(cHtml).some((cHref) => cHref.endsWith(C_MARCA_SUFIXO))).toBe(true);
   });

   test('CT-API-04 — Oficina sem o campo de favicon na resposta cai na marca CERTTUS', async ({
      request,
   }, testInfo) => {
      pularSeNaoAplicavel(!lHomologPortal(), C_MOTIVO_LOGO_ERP_HOMOLOG);
      const oMassa = await massaFaviconSemCampoPreparar(request);
      try {
         const cToken = tokenPreviewSemCampo();
         await expect
            .poll(
               async () => {
                  const oRes = await request.get(`${E2E_BASE_URL}/${cToken}`, {
                     headers: {'user-agent': C_UA_WHATSAPP},
                  });
                  const cHtml = await oRes.text();
                  return {
                     nStatus: oRes.status(),
                     lMarca: lMarcaCerttus(metaConteudo(cHtml, 'property', 'og:image')),
                  };
               },
               {timeout: 20_000, message: 'preview homolog deve cair na marca após omitir favicon'},
            )
            .toEqual({nStatus: 200, lMarca: true});
         const {nStatus, cHtml} = await htmlTokenObter(request, cToken, testInfo, 'CT-API-04');
         const cOgImage = metaConteudo(cHtml, 'property', 'og:image');
         expect(nStatus, 'GET preview após omitir favicon na config').toBe(200);
         expect(lMarcaCerttus(cOgImage)).toBe(true);
         expect(linksIcone(cHtml).some((cHref) => cHref.endsWith(C_MARCA_SUFIXO))).toBe(true);
      } finally {
         await oMassa.restaurar();
      }
   });

   test('CT-API-05 — Link válido não é indexado por buscadores', async ({request}, testInfo) => {
      const {cHtml} = await htmlTokenObter(request, tokenPreviewValido(), testInfo, 'CT-API-05');
      const cRobots = metaConteudo(cHtml, 'name', 'robots') || '';
      expect(cRobots).toContain('noindex');
      expect(cRobots).toContain('nofollow');
   });

   test('CT-API-06 — Link inexistente mostra preview neutro sem nome de oficina', async ({
      request,
   }, testInfo) => {
      const {cHtml} = await htmlTokenObter(request, C_TOKEN_INEXISTENTE, testInfo, 'CT-API-06');
      const cOgTitle = metaConteudo(cHtml, 'property', 'og:title');
      if (cOgTitle !== null) {
         expect(cOgTitle).toBe('Portal do Cliente');
      }
      expect(cHtml).not.toContain(C_NOME_OFICINA);
   });

   test('CT-API-07 — Link com formato inválido mostra preview neutro sem nome de oficina', async ({
      request,
   }, testInfo) => {
      const {cHtml} = await htmlTokenObter(request, 'abc', testInfo, 'CT-API-07');
      expect(tituloHtml(cHtml)).toBe('Portal do Cliente');
      expect(cHtml).not.toContain(C_NOME_OFICINA);
   });

   test('CT-API-08 — Link revogado mostra «Link indisponível» sem nome de oficina', async ({
      request,
   }, testInfo) => {
      const cToken = tokenRevogadoPreview();
      pularSeNaoAplicavel(
         cToken !== '',
         'Pré-condição de massa: falta um link revogado de homolog em PORTAL_TOKEN_REVOGADO_HOMOLOG (.env.local).',
      );
      const {cHtml} = await htmlTokenObter(request, cToken, testInfo, 'CT-API-08');
      expect(tituloHtml(cHtml)).toBe('Link indisponível | Portal do Cliente');
      expect(cHtml).not.toContain(C_NOME_OFICINA);
   });

   test('CT-API-09 — Portal não serve mais o favicon.ico padrão', async ({request}, testInfo) => {
      const oRes = await request.get(`${E2E_BASE_URL}/favicon.ico`);
      const {nStatus} = await oResposta(oRes, testInfo, 'CT-API-09');
      const cTipo = oRes.headers()['content-type'] || '';
      const lIconePadrao =
         nStatus === 200
         && (cTipo.includes('image/x-icon') || cTipo.includes('image/vnd.microsoft.icon'));
      expect(lIconePadrao).toBe(false);
   });

   test('CT-API-27 — Oficina sem favicon e com logo usa o logo no preview', async ({
      request,
   }, testInfo) => {
      if (!lHomologPortal()) {
         const {cHtml} = await htmlTokenObter(request, C_TOKEN_LINK_LOGO, testInfo, 'CT-API-27');
         expect(metaConteudo(cHtml, 'property', 'og:image')).toBe(C_LOGO_URL);
         expect(linksIcone(cHtml).some((cHref) => cHref.endsWith(C_MARCA_SUFIXO))).toBe(true);
         return;
      }
      // Homolog: sem favicon, o MS devolve o logo em cFaviconUrl (favicon → logo → nulo),
      // então preview e ícone da aba usam o logo da oficina.
      const cToken = tokenPreviewValido();
      const oMassa = await massaSoLogoPreparar(request);
      try {
         const oLanding = await request.get(`${E2E_BASE_URL}/api/bff/portal/${cToken}`);
         expect(oLanding.status(), 'landing do BFF após omitir o favicon').toBe(200);
         const cLogoUrl = ((await oLanding.json()) as {oDados: {cLogoUrl: string}}).oDados.cLogoUrl;
         expect(cLogoUrl, 'massa: a oficina precisa ter logo').toMatch(/^https?:\/\//);
         await expect
            .poll(
               async () => {
                  const oRes = await request.get(`${E2E_BASE_URL}/${cToken}`, {
                     headers: {'user-agent': C_UA_WHATSAPP},
                  });
                  return metaConteudo(await oRes.text(), 'property', 'og:image');
               },
               {timeout: 20_000, intervals: [2_000, 4_000], message: 'preview deve usar o logo'},
            )
            .toBe(cLogoUrl);
         const {nStatus, cHtml} = await htmlTokenObter(request, cToken, testInfo, 'CT-API-27');
         expect(nStatus).toBe(200);
         expect(metaConteudo(cHtml, 'property', 'og:image')).toBe(cLogoUrl);
         expect(linksIcone(cHtml)).toContain(cLogoUrl);
         expect(cHtml).not.toContain('/favicon.ico');
      } finally {
         await oMassa.restaurar();
      }
   });

   test.describe('Histórico e Meus dados com sessão', () => {
      /* Homolog: histórico ligado (todas as fases, 365 dias) só durante este bloco. */
      let oCtxMassa: APIRequestContext | undefined;
      let oMassaHistorico: oMassaHistoricoHomolog | undefined;
      let oAlvoCache: oItemHistorico | undefined;

      test.beforeAll(async ({playwright}) => {
         if (!lHomologPortal()) {
            return;
         }
         oCtxMassa = await playwright.request.newContext();
         oMassaHistorico = await massaHistoricoHomologPreparar(oCtxMassa);
      });

      test.afterAll(async () => {
         try {
            await oMassaHistorico?.restaurar();
         } finally {
            await oCtxMassa?.dispose();
         }
      });

      /** OS autorizada do histórico: stub fixo no local; homolog = 1ª outra OS do cliente. */
      async function alvoOkObter(oSessao: APIRequestContext): Promise<oItemHistorico> {
         if (!lHomologPortal()) {
            return {cOsPublicId: C_TOKEN_ALVO_OK, cStatus: 'P'};
         }
         if (oAlvoCache) {
            return oAlvoCache;
         }
         const oRes = await oSessao.get('/api/bff/cliente/historico');
         expect(oRes.status(), 'histórico homolog (massa do alvo)').toBe(200);
         const mOrdens = ((await oRes.json()) as {oDados: {mOrdens: oItemHistorico[]}}).oDados
            .mOrdens;
         oAlvoCache = mOrdens.find((oItem) => oItem.cOsPublicId !== tokenSessaoPortal());
         expect(
            oAlvoCache,
            'massa: o cliente do link precisa de outra OS com link ativo no histórico',
         ).toBeTruthy();
         return oAlvoCache as oItemHistorico;
      }

      /**
       * OS não autorizada: stub fixo no local; homolog = a mesma OS do cliente com a fase dela
       * fora da config (regra «fase não escolhida»). Fases voltam a todas no fim.
       */
      async function comAlvoNegado(
         oSessao: APIRequestContext,
         cRecurso: '' | '/fotos',
         fExecutar: (cAlvo: string) => Promise<void>,
      ): Promise<void> {
         if (!lHomologPortal()) {
            await fExecutar(C_TOKEN_ALVO_NEGADO);
            return;
         }
         const oAlvo = await alvoOkObter(oSessao);
         await oMassaHistorico!.fasesDefinir(
            C_FASES_HISTORICO_TODAS.filter((cFase) => cFase !== oAlvo.cStatus),
         );
         try {
            await expect
               .poll(
                  async () =>
                     (await oSessao.get(`/api/bff/cliente/os/${oAlvo.cOsPublicId}${cRecurso}`)).status(),
                  {timeout: 15_000, intervals: [1_500, 3_000], message: 'fase fora da config → 403'},
               )
               .toBe(403);
            await fExecutar(oAlvo.cOsPublicId);
         } finally {
            await oMassaHistorico!.fasesDefinir(C_FASES_HISTORICO_TODAS);
         }
      }

      test('CT-API-10 — Histórico com sessão devolve a lista de OS do cliente', async ({
         playwright,
      }, testInfo) => {
         const cTokenSessao = tokenSessaoPortal();
         await comSessaoWeb(playwright.request, cTokenSessao, async (oSessao) => {
            const oRes = await oSessao.get('/api/bff/cliente/historico');
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-10');
            const oCorpo = oJson(cTextoCorpo);
            const oDados = oCorpo.oDados as {
               nPeriodoDias: number;
               mFases: unknown[];
               mOrdens: Array<{cOsPublicId: string}>;
            };
            expect(nStatus).toBe(200);
            expect(oCorpo.lSucesso).toBe(true);
            expect(typeof oDados.nPeriodoDias).toBe('number');
            expect(Array.isArray(oDados.mFases)).toBe(true);
            if (lHomologPortal()) {
               expect(
                  oDados.mOrdens.length,
                  'massa: o cliente do link precisa de outra OS com link ativo',
               ).toBeGreaterThan(0);
            } else {
               expect(oDados.mOrdens).toHaveLength(1);
               expect(oDados.mOrdens[0].cOsPublicId).toBe(C_TOKEN_ALVO_OK);
            }
            expect(oDados.mOrdens.some((oItem) => oItem.cOsPublicId === cTokenSessao)).toBe(false);
         });
      });

      test('CT-API-11 — Histórico sem sessão é recusado', async ({request}, testInfo) => {
         const oRes = await request.get(`${E2E_BASE_URL}/api/bff/cliente/historico`);
         const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-11');
         expect(nStatus).toBe(401);
         expect(cTextoCorpo).not.toContain('mOrdens');
      });

      test('CT-API-12 — Meus dados com sessão devolve o cliente com documento mascarado', async ({
         playwright,
      }, testInfo) => {
         await comSessaoWeb(playwright.request, tokenSessaoPortal(), async (oSessao) => {
            const oRes = await oSessao.get('/api/bff/cliente/dados');
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-12');
            const oCorpo = oJson(cTextoCorpo);
            const oCliente = (oCorpo.oDados as {oCliente: Record<string, unknown>}).oCliente;
            expect(nStatus).toBe(200);
            if (lHomologPortal()) {
               const cDoc = String(oCliente.cDocumentoMascarado ?? '');
               expect(cDoc, 'documento com parte oculta').toContain('*');
               expect(cDoc.replace(/\D/g, '').length, 'documento não pode vir completo').toBeLessThan(
                  11,
               );
               expect(['CPF', 'CNPJ']).toContain(oCliente.cDocumentoTipo);
            } else {
               expect(oCliente.cDocumentoMascarado).toBe('***.456.789-**');
               expect(oCliente.cDocumentoTipo).toBe('CPF');
               expect(cTextoCorpo).not.toContain('12345678900');
            }
            expect(cTextoCorpo).not.toContain('cCpfCompleto');
         });
      });

      test('CT-API-13 — Meus dados sem sessão é recusado', async ({request}, testInfo) => {
         const oRes = await request.get(`${E2E_BASE_URL}/api/bff/cliente/dados`);
         const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-13');
         expect(nStatus).toBe(401);
         expect(cTextoCorpo).not.toContain('oCliente');
      });

      test('CT-API-14 — OS do histórico autorizada abre com a sessão atual', async ({
         playwright,
      }, testInfo) => {
         await comSessaoWeb(playwright.request, tokenSessaoPortal(), async (oSessao) => {
            const cAlvo = (await alvoOkObter(oSessao)).cOsPublicId;
            const oRes = await oSessao.get(`/api/bff/cliente/os/${cAlvo}`);
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-14');
            const oCorpo = oJson(cTextoCorpo);
            const oOrdem = (oCorpo.oDados as {oOrdemServico: {cOsPublicId: string}}).oOrdemServico;
            expect(nStatus).toBe(200);
            expect(oOrdem.cOsPublicId).toBe(cAlvo);
         });
      });

      test('CT-API-15 — OS do histórico não autorizada responde «Acesso negado.»', async ({
         playwright,
      }, testInfo) => {
         await comSessaoWeb(playwright.request, tokenSessaoPortal(), async (oSessao) => {
            await comAlvoNegado(oSessao, '', async (cAlvo) => {
               const oRes = await oSessao.get(`/api/bff/cliente/os/${cAlvo}`);
               const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-15');
               const oCorpo = oJson(cTextoCorpo);
               expect(nStatus).toBe(403);
               expect(oCorpo.lSucesso).toBe(false);
               expect(oCorpo.cMensagem).toBe(C_MENSAGEM_403);
               expect(cTextoCorpo).not.toContain('oOrdemServico');
            });
         });
      });

      test('CT-API-16 — Fotos da OS não autorizada também respondem «Acesso negado.»', async ({
         playwright,
      }, testInfo) => {
         await comSessaoWeb(playwright.request, tokenSessaoPortal(), async (oSessao) => {
            await comAlvoNegado(oSessao, '/fotos', async (cAlvo) => {
               const oRes = await oSessao.get(`/api/bff/cliente/os/${cAlvo}/fotos`);
               const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-16');
               expect(nStatus).toBe(403);
               expect(cTextoCorpo).not.toContain('mFotosPorFase');
            });
         });
      });

      test('CT-API-17 — Fotos da OS autorizada do histórico abrem com a sessão atual', async ({
         playwright,
      }, testInfo) => {
         await comSessaoWeb(playwright.request, tokenSessaoPortal(), async (oSessao) => {
            const cAlvo = (await alvoOkObter(oSessao)).cOsPublicId;
            const oRes = await oSessao.get(`/api/bff/cliente/os/${cAlvo}/fotos`);
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-17');
            const oCorpo = oJson(cTextoCorpo);
            const oDados = oCorpo.oDados as {mFotosPorFase: unknown[]};
            expect(nStatus).toBe(200);
            expect(Array.isArray(oDados.mFotosPorFase)).toBe(true);
         });
      });

      test('CT-API-18 — OS do histórico sem sessão é recusada', async ({request}, testInfo) => {
         const oRes = await request.get(`${E2E_BASE_URL}/api/bff/cliente/os/${C_TOKEN_ALVO_OK}`);
         const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-18');
         expect(nStatus).toBe(401);
         expect(cTextoCorpo).not.toContain('oOrdemServico');
      });
   });

   test.describe('BFF real', () => {
      test.beforeEach(async ({request}) => {
         await stubRequisicoesLimpar(request);
      });

      test('CT-API-19 — BFF repassa o favicon da oficina na landing', async ({
         request,
      }, testInfo) => {
         const oRes = await request.get(`${E2E_API_BASE_URL}/portal/${C_TOKEN_LINK_FAVICON}`);
         const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-19');
         const oDados = oJson(cTextoCorpo).oDados as {cFaviconUrl: string | null};
         expect(nStatus).toBe(200);
         expect(oDados.cFaviconUrl).toBe(C_FAVICON_URL);
      });

      test('CT-API-20 — BFF devolve favicon nulo quando a oficina não tem favicon nem logo', async ({
         request,
      }, testInfo) => {
         const oRes = await request.get(`${E2E_API_BASE_URL}/portal/${C_TOKEN_LINK_SEM_FAVICON}`);
         const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-20');
         const oDados = oJson(cTextoCorpo).oDados as {cFaviconUrl: string | null};
         expect(nStatus).toBe(200);
         expect(oDados.cFaviconUrl).toBeNull();
      });

      test('CT-API-21 — BFF lista o histórico sempre da OS da sessão', async ({
         playwright,
         request,
      }, testInfo) => {
         await comSessaoBff(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
            const oRes = await oSessao.get(
               `/cliente/historico?cOsPublicId=${C_TOKEN_ALVO_OK}`,
            );
            const {nStatus} = await oResposta(oRes, testInfo, 'CT-API-21');
            const mHist = mReqsPorTrecho(await stubRequisicoesObter(request), '/historico');
            expect(nStatus).toBe(200);
            expect(mHist.length).toBeGreaterThan(0);
            for (const oReq of mHist) {
               expect(oReq.cPath).toContain(C_TOKEN_SESSAO);
            }
         });
      });

      test('CT-API-22 — BFF repassa 422 quando o histórico está desligado', async ({
         playwright,
         request,
      }, testInfo) => {
         await comSessaoBff(playwright.request, request, C_TOKEN_SESSAO_422, async (oSessao) => {
            const oRes = await oSessao.get('/cliente/historico');
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-22');
            const oCorpo = oJson(cTextoCorpo);
            expect(nStatus).toBe(422);
            expect(oCorpo.lSucesso).toBe(false);
            expect(cTextoCorpo).not.toContain('mOrdens');
         });
      });

      test('CT-API-23 — BFF devolve Meus dados só com os campos do contrato', async ({
         playwright,
         request,
      }, testInfo) => {
         await comSessaoBff(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
            const oRes = await oSessao.get('/cliente/dados');
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-23');
            const oCliente = (oJson(cTextoCorpo).oDados as {oCliente: Record<string, unknown>})
               .oCliente;
            expect(nStatus).toBe(200);
            expect(typeof oCliente.cNome).toBe('string');
            expect(String(oCliente.cNome).length).toBeGreaterThan(0);
            expect(String(oCliente.cDocumentoMascarado)).toContain('*');
            expect(cTextoCorpo).not.toContain('cRg');
            expect(cTextoCorpo).not.toContain('cCpfCompleto');
         });
      });

      test('CT-API-24 — BFF recusa Meus dados sem sessão sem consultar o MS', async ({
         request,
      }, testInfo) => {
         const oRes = await request.get(`${E2E_API_BASE_URL}/cliente/dados`);
         const {nStatus} = await oResposta(oRes, testInfo, 'CT-API-24');
         const mReqs = await stubRequisicoesObter(request);
         expect(nStatus).toBe(401);
         expect(mReqsPorTrecho(mReqs, '/cliente')).toEqual([]);
      });

      test('CT-API-25 — BFF abre OS do histórico autorizada com o token de origem', async ({
         playwright,
         request,
      }, testInfo) => {
         await comSessaoBff(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
            const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_OK}`);
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-25');
            const oOrdem = (oJson(cTextoCorpo).oDados as {oOrdemServico: {cOsPublicId: string}})
               .oOrdemServico;
            const mDetalhe = mReqsPorTrecho(
               await stubRequisicoesObter(request),
               `/os/${C_TOKEN_ALVO_OK}/detalhe`,
            );
            expect(nStatus).toBe(200);
            expect(oOrdem.cOsPublicId).toBe(C_TOKEN_ALVO_OK);
            expect(mDetalhe.length).toBeGreaterThan(0);
            expect(mDetalhe[0].oHeaders['x-portal-token-origem']).toBe(C_TOKEN_SESSAO);
         });
      });

      test('CT-API-26 — BFF responde 403 uniforme quando a OS alvo não existe para o cliente', async ({
         playwright,
         request,
      }, testInfo) => {
         await comSessaoBff(playwright.request, request, C_TOKEN_SESSAO, async (oSessao) => {
            const oRes = await oSessao.get(`/cliente/os/${C_TOKEN_ALVO_NEGADO}`);
            const {nStatus, cTextoCorpo} = await oResposta(oRes, testInfo, 'CT-API-26');
            const oCorpo = oJson(cTextoCorpo);
            expect(nStatus).toBe(403);
            expect(oCorpo.cMensagem).toBe(C_MENSAGEM_403);
            expect(cTextoCorpo).not.toContain('oOrdemServico');
         });
      });
   });
});
