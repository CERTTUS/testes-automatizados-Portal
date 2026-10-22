import pg from 'pg';
import {cEnv} from './env';
import {EMPRESA_PERMITIDA, GuardaPortalErro, urlBancoTesteValidada} from './portalGuard';

/**
 * Sonda SEM gravação: POST /portal/link com empresa inexistente ('9999').
 * No api-microservicos o fluxo lê `pcmtemp0` (empresa) e responde 422 "Empresa não elegível..." ANTES de
 * consultar flags ou tocar o catálogo (os_link_publico) — nenhum link é criado.
 * Se a API estiver apontada para o banco errado (ex.: sistemacerttus), a leitura falha com
 * 500 `relation "pcmtemp0" does not exist`.
 */
export async function sondarBancoDaApi(cBaseUrl: string, cDatabase: string, cSerie: string): Promise<void> {
   const cChave = cEnv('PORTAL_MS_CHAVEAPI');
   if (!cChave) {
      throw new GuardaPortalErro('PORTAL_MS_CHAVEAPI ausente no .env.local.');
   }
   let oRes: Response;
   try {
      oRes = await fetch(`${cBaseUrl}/portal/link`, {
         method: 'POST',
         headers: {'Content-Type': 'application/json', chaveapi: cChave},
         body: JSON.stringify({
            cDatabase,
            cEmpresa: '9999',
            cOrdemServico: '000000',
            cSerie,
            cTelefone: '11999990001',
         }),
         signal: AbortSignal.timeout(15_000),
      });
   } catch {
      throw new GuardaPortalErro(
         `API indisponível em ${cBaseUrl}. Suba o api-microservicos (npm run dev) e confira PORTAL_MS_BASE_URL.`,
      );
   }
   const cCorpo = await oRes.text();

   if (oRes.status === 401) {
      throw new GuardaPortalErro('API recusou a chaveapi (401). Confira PORTAL_MS_CHAVEAPI.');
   }
   if (oRes.status === 500 && /pcmtemp0/i.test(cCorpo) && /does not exist/i.test(cCorpo)) {
      throw new GuardaPortalErro(
         'O MS está lendo o banco ERRADO (relation "pcmtemp0" does not exist). ' +
            'Modo LOCAL: BANCO_DADOS_URL do .env do api-microservicos deve apontar para .../portaldocliente. ' +
            'Modo NUVEM (BANCO_DADOS_TIPO=NUVEM): o catálogo (sistemacerttus.bancosdados) precisa ter PORTALDOCLIENTE apontando para o Postgres local. ' +
            '(Esta suíte não edita esse .env; reinicie a API depois de ajustar.)',
      );
   }
   if (oRes.status === 500 && /(servidor n[ãa]o encontrado|detalhes de conex)/i.test(cCorpo)) {
      throw new GuardaPortalErro(
         `O MS (modo NUVEM) não achou o banco "${cDatabase}" no catálogo (bancosdados/rdsservidores). Cadastre o banco no catálogo ou use BANCO_DADOS_TIPO=LOCAL apontando para portaldocliente.`,
      );
   }
   if (oRes.status === 422 && /empresa n[ãa]o eleg/i.test(cCorpo)) {
      return; // banco correto: a consulta a pcmtemp0 funcionou e nada foi gravado
   }
   throw new GuardaPortalErro(
      `Sonda inesperada: HTTP ${oRes.status} ${cCorpo.slice(0, 200).replace(/\s+/g, ' ')}. ` +
         'Esperado 422 "Empresa não elegível" (banco correto).',
   );
}

/**
 * Ao gravar a OS, a api-mobile (best-effort) emite o link e, com `portalclienteenviarlinkwhatsapp = 1`, WhatsApp
 * conectado, pacote contratado e cliente com "evolução comunicar", ENVIA a mensagem do link ao celular da OS
 * (mesmo fictício). Fail-closed: se o ERP local está configurado para enviar, exige ciência explícita
 * (PORTAL_ACEITA_WHATSAPP_REAL=1) ou que o humano desligue o envio na empresa 0001. SELECT somente leitura.
 */
export async function exigirCienciaEnvioWhatsapp(): Promise<void> {
   const oCli = new pg.Client({connectionString: urlBancoTesteValidada(), connectionTimeoutMillis: 5_000});
   await oCli.connect();
   let nEnvia = 0;
   try {
      const oRes = await oCli.query<{portalclienteenviarlinkwhatsapp: number | null}>(
         'SELECT portalclienteenviarlinkwhatsapp FROM configuracoesservicosordemservicofluxo WHERE empresa = $1',
         [EMPRESA_PERMITIDA],
      );
      nEnvia = Number(oRes.rows[0]?.portalclienteenviarlinkwhatsapp ?? 0);
   } finally {
      await oCli.end().catch(() => undefined);
   }
   const cReal = (cEnv('PORTAL_TELEFONE_QA_REAL') || '').replace(/\D/g, '');
   if (nEnvia === 1 && cReal && cEnv('PORTAL_ACEITA_WHATSAPP_REAL') === '1') {
      return; // envio real ciente, limitado ao celular do QA (unico real aceito pelo guard)
   }
   if (nEnvia === 1 && cEnv('PORTAL_ACEITA_WHATSAPP_REAL') !== '1') {
      throw new GuardaPortalErro(
         `a empresa ${EMPRESA_PERMITIDA} tem portalclienteenviarlinkwhatsapp=1: criar a OS pela api-mobile pode ENVIAR WhatsApp real ao celular fictício da OS. ` +
            'Opções: (a) desligar o envio de link por WhatsApp na empresa de teste (configuração do ERP) e rodar de novo; ' +
            '(b) com ciência do risco, exportar PORTAL_ACEITA_WHATSAPP_REAL=1 na sessão (não gravar no .env.local).',
      );
   }
}
