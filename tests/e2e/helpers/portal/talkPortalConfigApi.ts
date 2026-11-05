import {expect, type APIRequestContext} from '@playwright/test';
import {TALK_API_URL} from '../env';
import {cEmailTalk, cSenhaTalk, empresaPortal2881, lHomologPortal} from './massaPortal2881';

const C_TIMEZONE = 'America/Sao_Paulo';

export type oMassaFaviconSemCampo = {
   lAlterou: boolean;
   lRestaurouFavicon: boolean;
   lRestaurouLogo: boolean;
   restaurar: () => Promise<void>;
};

export type oHistoricoConfigTalk = {
   lExibir: boolean;
   mFases: string[];
   nPeriodoDias: number;
};

/** Todas as fases que o Talk aceita no histórico (C — cancelada — nunca). */
export const C_FASES_HISTORICO_TODAS = ['D', 'P', 'O', ' ', 'E', 'T', 'R', 'B', 'U', 'F', 'A'];
const N_PERIODO_HISTORICO_MASSA = 365;

type oConfigTalk = {
   faviconUrl: string | null;
   logoUrl: string | null;
   historicoConfig: oHistoricoConfigTalk | null;
};

type oPatchConfigTalk = {
   faviconUrl?: string | null;
   logoUrl?: string | null;
   historicoConfig?: oHistoricoConfigTalk;
};

function cUrlNaoVazia(cValor: unknown): string | null {
   return typeof cValor === 'string' && cValor.trim().length > 0 ? cValor.trim() : null;
}

async function talkAutenticar(request: APIRequestContext): Promise<string> {
   const cEmail = cEmailTalk();
   const cSenha = cSenhaTalk();
   expect(cEmail, 'TALK_EMAIL precisa estar no .env.local').not.toBe('');
   expect(cSenha, 'TALK_PASSWORD precisa estar no .env.local').not.toBe('');
   const oRes = await request.post(`${TALK_API_URL}/auth/login`, {
      headers: {
         'content-type': 'application/json',
         timezone: C_TIMEZONE,
      },
      data: {email: cEmail, password: cSenha, tipoDeDispositivo: 'desktop'},
   });
   expect(oRes.status(), 'login Talk para massa homolog').toBe(200);
   const oCorpo = (await oRes.json()) as {token?: string};
   expect(oCorpo.token, 'token Talk após login').toBeTruthy();
   return oCorpo.token as string;
}

function oHeadersTalk(cToken: string): Record<string, string> {
   return {
      authorization: `Bearer ${cToken}`,
      timezone: C_TIMEZONE,
   };
}

async function configCarregar(
   request: APIRequestContext,
   cToken: string,
   cEmpresa: string,
): Promise<oConfigTalk> {
   const oRes = await request.get(`${TALK_API_URL}/portal-cliente/config/${cEmpresa}`, {
      headers: oHeadersTalk(cToken),
   });
   expect(oRes.status(), 'GET config Talk').toBe(200);
   const oCfg = (await oRes.json()) as Record<string, unknown>;
   return {
      faviconUrl: cUrlNaoVazia(oCfg.faviconUrl),
      logoUrl: cUrlNaoVazia(oCfg.logoUrl),
      historicoConfig: (oCfg.historicoConfig as oHistoricoConfigTalk | undefined) ?? null,
   };
}

async function configPatch(
   request: APIRequestContext,
   cToken: string,
   cEmpresa: string,
   oPatch: oPatchConfigTalk,
): Promise<void> {
   const oRes = await request.patch(`${TALK_API_URL}/portal-cliente/config/${cEmpresa}`, {
      headers: {...oHeadersTalk(cToken), 'content-type': 'application/json'},
      data: oPatch,
   });
   expect(oRes.status(), `PATCH config Talk (massa homolog: ${Object.keys(oPatch).join(', ')})`).toBe(
      200,
   );
}

/**
 * Homolog: PATCH faviconUrl null (e logoUrl se o logo preencheria o preview).
 * Stub local: no-op. Restaurar no finally do CT.
 */
export async function massaFaviconSemCampoPreparar(
   request: APIRequestContext,
): Promise<oMassaFaviconSemCampo> {
   const oNoop: oMassaFaviconSemCampo = {
      lAlterou: false,
      lRestaurouFavicon: false,
      lRestaurouLogo: false,
      restaurar: async () => undefined,
   };
   if (!lHomologPortal()) {
      return oNoop;
   }

   const cEmpresa = empresaPortal2881();
   const cToken = await talkAutenticar(request);
   const oAntes = await configCarregar(request, cToken, cEmpresa);
   const oPatch: {faviconUrl?: string | null; logoUrl?: string | null} = {};
   if (oAntes.faviconUrl) {
      oPatch.faviconUrl = null;
   }
   if (oAntes.logoUrl) {
      oPatch.logoUrl = null;
   }
   if (Object.keys(oPatch).length === 0) {
      return oNoop;
   }
   await configPatch(request, cToken, cEmpresa, oPatch);
   const oDepois = await configCarregar(request, cToken, cEmpresa);
   expect(oDepois.faviconUrl, 'PATCH deve omitir favicon_url na config').toBeNull();
   if (oPatch.logoUrl === null) {
      expect(oDepois.logoUrl, 'PATCH deve omitir logo_url para o preview cair na marca').toBeNull();
   }

   const oSaida: oMassaFaviconSemCampo = {
      lAlterou: true,
      lRestaurouFavicon: false,
      lRestaurouLogo: false,
      restaurar: async () => {
         const oVolta: {faviconUrl?: string | null; logoUrl?: string | null} = {};
         if (oPatch.faviconUrl === null && oAntes.faviconUrl) {
            oVolta.faviconUrl = oAntes.faviconUrl;
         }
         if (oPatch.logoUrl === null && oAntes.logoUrl) {
            oVolta.logoUrl = oAntes.logoUrl;
         }
         if (Object.keys(oVolta).length === 0) {
            return;
         }
         await configPatch(request, cToken, cEmpresa, oVolta);
         oSaida.lRestaurouFavicon = Boolean(oVolta.faviconUrl);
         oSaida.lRestaurouLogo = Boolean(oVolta.logoUrl);
      },
   };
   return oSaida;
}

export type oMassaHistoricoHomolog = {
   lAlterou: boolean;
   /** Mantém o histórico ligado e troca só as fases (≥ 1). */
   fasesDefinir: (mFases: string[]) => Promise<void>;
   restaurar: () => Promise<void>;
};

/**
 * Homolog: liga o histórico da empresa (todas as fases, 365 dias) para os CTs com sessão.
 * `restaurar` devolve o historicoConfig lido antes. Stub local: no-op.
 */
export async function massaHistoricoHomologPreparar(
   request: APIRequestContext,
): Promise<oMassaHistoricoHomolog> {
   if (!lHomologPortal()) {
      return {lAlterou: false, fasesDefinir: async () => undefined, restaurar: async () => undefined};
   }
   const cEmpresa = empresaPortal2881();
   const cToken = await talkAutenticar(request);
   const oAntes = await configCarregar(request, cToken, cEmpresa);
   expect(oAntes.historicoConfig, 'GET config Talk deve trazer historicoConfig').not.toBeNull();
   const fasesDefinir = async (mFases: string[]): Promise<void> => {
      expect(mFases.length, 'histórico ligado exige ao menos uma fase').toBeGreaterThan(0);
      await configPatch(request, cToken, cEmpresa, {
         historicoConfig: {lExibir: true, mFases, nPeriodoDias: N_PERIODO_HISTORICO_MASSA},
      });
   };
   await fasesDefinir(C_FASES_HISTORICO_TODAS);
   return {
      lAlterou: true,
      fasesDefinir,
      restaurar: async () => {
         await configPatch(request, cToken, cEmpresa, {
            historicoConfig: oAntes.historicoConfig as oHistoricoConfigTalk,
         });
      },
   };
}

/**
 * Homolog CT-API-27: omite só o favicon (o logo continua). Stub local: no-op.
 */
export async function massaSoLogoPreparar(
   request: APIRequestContext,
): Promise<{lAlterou: boolean; restaurar: () => Promise<void>}> {
   if (!lHomologPortal()) {
      return {lAlterou: false, restaurar: async () => undefined};
   }
   const cEmpresa = empresaPortal2881();
   const cToken = await talkAutenticar(request);
   const oAntes = await configCarregar(request, cToken, cEmpresa);
   if (!oAntes.faviconUrl) {
      return {lAlterou: false, restaurar: async () => undefined};
   }
   await configPatch(request, cToken, cEmpresa, {faviconUrl: null});
   expect((await configCarregar(request, cToken, cEmpresa)).faviconUrl).toBeNull();
   return {
      lAlterou: true,
      restaurar: async () => {
         await configPatch(request, cToken, cEmpresa, {faviconUrl: oAntes.faviconUrl});
      },
   };
}

/**
 * Homolog E2E do Talk: guarda favicon e logo antes dos envios e devolve no fim.
 * As imagens enviadas ficam no S3; só a config volta. Stub local: no-op.
 */
export async function imagensTalkFotografar(
   request: APIRequestContext,
): Promise<{restaurar: () => Promise<void>}> {
   if (!lHomologPortal()) {
      return {restaurar: async () => undefined};
   }
   const cEmpresa = empresaPortal2881();
   const oAntes = await configCarregar(request, await talkAutenticar(request), cEmpresa);
   return {
      restaurar: async () => {
         const cToken = await talkAutenticar(request);
         await configPatch(request, cToken, cEmpresa, {
            faviconUrl: oAntes.faviconUrl,
            logoUrl: oAntes.logoUrl,
         });
         const oDepois = await configCarregar(request, cToken, cEmpresa);
         expect(oDepois.faviconUrl, 'favicon restaurado').toBe(oAntes.faviconUrl);
         expect(oDepois.logoUrl, 'logo restaurado').toBe(oAntes.logoUrl);
      },
   };
}
