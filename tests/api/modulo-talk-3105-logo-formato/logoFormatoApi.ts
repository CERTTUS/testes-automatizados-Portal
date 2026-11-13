// Massa do stub MS (scripts/qa/stub-ms-portal-landing.mjs) usada pelo módulo modulo-talk-3105-logo-formato.
export const C_TOKEN_LOGO_HORIZONTAL = 'tokLogoHorizontalT3105';
export const C_TOKEN_SEM_LOGO = 'tokSemLogoOficinaT3105';

// Mesma string que o stub manda (domínio, caminho e query string): o BFF tem que repassar sem reescrever.
export const C_LOGO_URL_HORIZONTAL =
   'https://cdn.sistema.certtus.com.br/tenantteste/0001/portal-cliente/logo-horizontal.png?v=20261112';

export const C_NOME_LOGO_HORIZONTAL = 'Oficina Logo Horizontal';
export const C_NOME_SEM_LOGO = 'Oficina Sem Logo';

// RN7: nenhum campo de formato ou medida da logo trafega na API.
export const M_CHAVES_FORMATO_PROIBIDAS = [
   'cLogoFormato',
   'cFormatoLogo',
   'cLogoProporcao',
   'nLogoLargura',
   'nLogoAltura',
   'oLogo',
] as const;
