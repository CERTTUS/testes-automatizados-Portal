import path from 'node:path';
import {cEnv} from '../env';
import {telefoneAutorizado, tokenPortalOk} from '../portalFixtures';

export function tokenPortal2881(): string {
   return cEnv('PORTAL_TOKEN_HOMOLOG') || tokenPortalOk();
}

export function telefonePortal2881(): string {
   return cEnv('PORTAL_TELEFONE_HOMOLOG') || telefoneAutorizado();
}

export function tokenPortalSemFavicon(): string {
   return cEnv('PORTAL_TOKEN_SEM_FAVICON') || 'tokLinkHist2880SemFavicon';
}

export function urlFaviconExistente(): string {
   return cEnv('PORTAL_FAVICON_URL_EXISTENTE') || '/marca/certtus-marca.png';
}

export function lHomologPortal(): boolean {
   const cBase = cEnv('E2E_BASE_URL', 'http://localhost:3000');
   return cEnv('PORTAL_E2E_HOMOLOG') === '1' || /34\.195\.122\.141/.test(cBase);
}

export function cEmailTalk(): string {
   return cEnv('TALK_EMAIL');
}

export function cSenhaTalk(): string {
   return cEnv('TALK_PASSWORD');
}

export function empresaPortal2881(): string {
   return cEnv('PORTAL_EMPRESA_HOMOLOG', '0001');
}

export function cCaminhoFixtureImagem(cArquivo: string): string {
   return path.resolve(process.cwd(), 'assets', 'images', cArquivo);
}

export const C_FIXTURE_FAVICON_ADICIONAR = 'favicon-adicionar.png';
export const C_FIXTURE_FAVICON_ALTERAR = 'favicon-alterar.png';
export const C_FIXTURE_LOGO_ADICIONAR = 'logo-adicionar.png';
export const C_FIXTURE_LOGO_ALTERAR = 'logo-alterar.png';

export const C_HISTORICO_VAZIO = {
   nPeriodoDias: 180,
   mFases: ['E'],
   mOrdens: [] as Array<Record<string, string>>,
};

export const C_HISTORICO_LISTA = {
   nPeriodoDias: 180,
   mFases: ['E', 'F'],
   mOrdens: [
      {
         cOsPublicId: 'tokHistAtual2881XXXXXXX',
         cNumeroOs: '076017',
         cSerie: '1',
         cStatus: 'E',
         cStatusDescricao: 'Entregue',
         dRecepcao: '2026-05-10T09:00:00-03:00',
         cPlaca: 'ABC1D23',
         cMotorDescricao: 'Motor Scania DC13',
      },
      {
         cOsPublicId: 'tokHistOutra2881XXXXXXX',
         cNumeroOs: '000987',
         cSerie: '1',
         cStatus: 'F',
         cStatusDescricao: 'Faturada',
         dRecepcao: '2026-03-02T08:30:00-03:00',
         cVeiculoDescricao: 'Caminhão Volvo FH',
      },
   ],
};

export const C_DADOS_CLIENTE_MASCARADO = {
   oCliente: {
      cNome: 'Cliente E2E',
      cTelefone: '(11) 99999-0000',
      cEmail: 'cliente.e2e@exemplo.com.br',
      cDocumentoMascarado: '***.999.999-**',
      cDocumentoTipo: 'CPF' as const,
   },
};
