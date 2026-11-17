import {expect, type APIRequestContext} from '@playwright/test';
import {E2E_API_BASE_URL, TALK_API_URL} from '../env';
import {
   M_CHAVES_CARD,
   M_CHAVES_TEXTO_ELEMENTO,
   O_TEMA_CARDS_SEPARADOS,
   O_TEMA_TEXTO_AUTOMATICO,
   O_TEMA_TEXTO_LEGADO,
   O_TEMA_TEXTO_PERSONALIZADO,
} from '../../../api/modulo-talk-3103-cor-texto-elementos/corTextoElementosApi';
import {
   cEmailTalk,
   cSenhaTalk,
   empresaPortal2881,
   lHomologPortal,
} from './massaPortal2881';
import {requisicaoGetComRetry429} from './bffHomologRetry';

export type CenarioT3103Homolog =
   | 'personalizado'
   | 'automatico'
   | 'legado'
   | 'invalido'
   | 'cards';

const C_TIMEZONE = 'America/Sao_Paulo';
const N_ESPERA_MS = 2_500;
const N_CACHE_TALK_MS = 8 * 60_000;

let cTalkTokenCache = '';
let nTalkTokenExpiraMs = 0;

function nulosForaDoLegado(): Record<string, null> {
   const mChaves = [...M_CHAVES_TEXTO_ELEMENTO, ...M_CHAVES_CARD] as const;
   return Object.fromEntries(
      mChaves
         .filter((cChave) => !Object.prototype.hasOwnProperty.call(O_TEMA_TEXTO_LEGADO, cChave))
         .map((cChave) => [cChave, null]),
   );
}

/** Landing estável no homolog; cores inválidas só nos três campos do CT-04. */
function temaInvalidoHomologPatch(): Record<string, string | null> {
   const mNulos = Object.fromEntries(
      [...M_CHAVES_TEXTO_ELEMENTO, ...M_CHAVES_CARD]
         .filter(
            (cChave) =>
               cChave !== 'authCardTexto' &&
               cChave !== 'authRodapeTexto' &&
               cChave !== 'acaoDestaqueTexto',
         )
         .map((cChave) => [cChave, null]),
   );
   return {
      editor: 'avancado',
      loginFundo: '#0F3D73',
      loginTexto: '#171717',
      authCabecalho: '#1C1C1C',
      authFundo: '#262626',
      authCard: '#FFFFFF',
      authRodape: '#1C1C1C',
      authCardTexto: 'roxo',
      authRodapeTexto: '#12345',
      acaoDestaqueTexto: 'rgb(255, 0, 0)',
      ...mNulos,
   };
}

const M_TEMA_POR_CENARIO: Record<
   CenarioT3103Homolog,
   {cTemaModo: string; oTemaAvancado: Record<string, string | null>}
> = {
   personalizado: {cTemaModo: 'claro', oTemaAvancado: O_TEMA_TEXTO_PERSONALIZADO},
   automatico: {cTemaModo: 'claro', oTemaAvancado: O_TEMA_TEXTO_AUTOMATICO},
   legado: {
      cTemaModo: 'claro',
      oTemaAvancado: {...O_TEMA_TEXTO_LEGADO, ...nulosForaDoLegado()},
   },
   invalido: {cTemaModo: 'claro', oTemaAvancado: temaInvalidoHomologPatch()},
   cards: {
      cTemaModo: 'claro',
      oTemaAvancado: {
         ...O_TEMA_CARDS_SEPARADOS,
         authCardAbasTexto: null,
         authJanelaDadosTexto: null,
         authCardTexto: null,
      },
   },
};

const M_LOGIN_TEXTO_PROBE: Partial<Record<CenarioT3103Homolog, string>> = {
   personalizado: '#7A2E00',
   automatico: '#171717',
   legado: '#E0E0E0',
   invalido: undefined,
   cards: undefined,
};

async function talkAutenticar(request: APIRequestContext): Promise<string> {
   if (cTalkTokenCache && Date.now() < nTalkTokenExpiraMs) {
      return cTalkTokenCache;
   }
   const cEmail = cEmailTalk();
   const cSenha = cSenhaTalk();
   expect(cEmail, 'TALK_EMAIL no .env.local').not.toBe('');
   expect(cSenha, 'TALK_PASSWORD no .env.local').not.toBe('');
   const oRes = await request.post(`${TALK_API_URL}/auth/login`, {
      headers: {'content-type': 'application/json', timezone: C_TIMEZONE},
      data: {email: cEmail, password: cSenha, tipoDeDispositivo: 'desktop'},
   });
   expect(oRes.status(), 'login Talk homolog T3103').toBe(200);
   const oCorpo = (await oRes.json()) as {token?: string};
   expect(oCorpo.token).toBeTruthy();
   cTalkTokenCache = oCorpo.token as string;
   nTalkTokenExpiraMs = Date.now() + N_CACHE_TALK_MS;
   return cTalkTokenCache;
}

async function aguardarLandingProbe(
   request: APIRequestContext,
   cLoginTexto: string,
   cTokenProbe: string,
): Promise<void> {
   const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cTokenProbe)}`;
   await expect
      .poll(
         async () => {
            const oRes = await requisicaoGetComRetry429(request, cUrl);
            if (oRes.status() !== 200) {
               return '';
            }
            const o = (await oRes.json()) as {
               oDados?: {oTemaAvancado?: {loginTexto?: string}};
            };
            return (o.oDados?.oTemaAvancado?.loginTexto ?? '').toUpperCase();
         },
         {
            message: `landing homolog após PATCH tema (probe ${cTokenProbe})`,
            timeout: 20_000,
         },
      )
      .toBe(cLoginTexto.toUpperCase());
}

async function aguardarLandingInvalidoProbe(
   request: APIRequestContext,
   cTokenProbe: string,
): Promise<void> {
   const cUrl = `${E2E_API_BASE_URL}/portal/${encodeURIComponent(cTokenProbe)}`;
   await expect
      .poll(
         async () => {
            const oRes = await requisicaoGetComRetry429(request, cUrl);
            if (oRes.status() !== 200) {
               return '';
            }
            const o = (await oRes.json()) as {
               lSucesso?: boolean;
               oDados?: {oTemaAvancado?: {authCardTexto?: string}};
            };
            if (o.lSucesso !== true) {
               return '';
            }
            return o.oDados?.oTemaAvancado?.authCardTexto ?? '';
         },
         {
            message: `landing homolog tema inválido (probe ${cTokenProbe})`,
            timeout: 60_000,
            intervals: [2_000, 3_000, 5_000, 8_000],
         },
      )
      .toBe('roxo');
}

/**
 * Homolog: PATCH tema da empresa no Talk antes dos CTs do cenário.
 * Stub/local: no-op.
 */
export async function aplicarTemaT3103Homolog(
   request: APIRequestContext,
   cCenario: CenarioT3103Homolog,
   cTokenProbe?: string,
): Promise<void> {
   if (!lHomologPortal()) {
      return;
   }
   const oPatch = M_TEMA_POR_CENARIO[cCenario];
   const cTokenTalk = await talkAutenticar(request);
   const cEmpresa = empresaPortal2881();
   const oRes = await request.patch(`${TALK_API_URL}/portal-cliente/config/${cEmpresa}`, {
      headers: {
         authorization: `Bearer ${cTokenTalk}`,
         timezone: C_TIMEZONE,
         'content-type': 'application/json',
      },
      data: {
         temaModo: oPatch.cTemaModo,
         temaAvancado: oPatch.oTemaAvancado,
      },
   });
   expect(oRes.status(), `PATCH tema T3103 (${cCenario})`).toBe(200);
   await new Promise((r) => setTimeout(r, N_ESPERA_MS));
   const cLoginProbe = M_LOGIN_TEXTO_PROBE[cCenario];
   if (cCenario === 'invalido' && cTokenProbe) {
      await aguardarLandingInvalidoProbe(request, cTokenProbe);
   } else if (cLoginProbe && cTokenProbe) {
      await aguardarLandingProbe(request, cLoginProbe, cTokenProbe);
   }
}