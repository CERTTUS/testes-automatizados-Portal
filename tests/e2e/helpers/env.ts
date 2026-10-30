export function cEnv(cChave: string, cPadrao = ''): string {
   return (process.env[cChave] || cPadrao).trim();
}

export const E2E_BASE_URL = cEnv('E2E_BASE_URL', 'http://localhost:3000');
export const E2E_API_BASE_URL = cEnv('E2E_API_BASE_URL', 'http://127.0.0.1:3333').replace(
   /\/+$/,
   '',
);
export const TALK_BASE_URL = cEnv('TALK_BASE_URL', 'http://34.195.122.141:8081').replace(
   /\/+$/,
   '',
);
export const TALK_API_URL = (
   cEnv('TALK_API_URL') || TALK_BASE_URL.replace(/:8081$/, ':8080')
).replace(/\/+$/, '');
