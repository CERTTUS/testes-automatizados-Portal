import {test as setup} from '@playwright/test';
import {PORTAL_MS_BASE_URL, PORTAL_MS_DATABASE, PORTAL_MS_SERIE} from '../../../helpers/portalLink';
import {exigirApiLocal, exigirOptInSupabase, urlBancoTesteValidada} from '../../../helpers/portalGuard';
import {habilitarFlagPortal} from '../../../helpers/portalFlagDb';
import {exigirCienciaEnvioWhatsapp, sondarBancoDaApi} from '../../../helpers/portalPreflight';
import {exigirPreRequisitosCriacaoOs, loginApiMobile, sondarApiMobile} from '../../../helpers/portalApiMobile';

/**
 * Projeto `portal-link-409-setup` (dependência do projeto `portal-link-409`): roda UMA vez por execução,
 * antes dos specs (que então rodam em paralelo; cada spec cria a própria OS no beforeAll).
 * Ordem: guardas e pré-requisitos (env, api-mobile no ar, login, WhatsApp) → sonda do banco do MS (leitura) → flag.
 * Falhou antes da flag = nada foi alterado (o login só vincula/reusa o dispositivo, sem criar OS).
 */
setup('Preparar ambiente do módulo portal-link-409-ctoken: guardas, banco da API e flag do Portal', async () => {
   urlBancoTesteValidada();
   exigirApiLocal(PORTAL_MS_BASE_URL);
   exigirOptInSupabase();
   exigirPreRequisitosCriacaoOs();
   await sondarApiMobile();
   await loginApiMobile(); // falha clara se usuário/senha/dispositivo inválidos
   await exigirCienciaEnvioWhatsapp();
   await sondarBancoDaApi(PORTAL_MS_BASE_URL, PORTAL_MS_DATABASE, PORTAL_MS_SERIE);
   const nOriginal = await habilitarFlagPortal();
   console.log(`[portal-link-409] portalclienteutilizar habilitado na empresa 0001 (valor original salvo: ${nOriginal}).`);
});
