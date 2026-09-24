export function cEnv(cChave: string, cPadrao = ''): string {
   return (process.env[cChave] || cPadrao).trim();
}

export const E2E_BASE_URL = cEnv('E2E_BASE_URL', 'http://localhost:3000');
export const E2E_API_BASE_URL = cEnv('E2E_API_BASE_URL', 'http://127.0.0.1:3333').replace(
   /\/+$/,
   '',
);
