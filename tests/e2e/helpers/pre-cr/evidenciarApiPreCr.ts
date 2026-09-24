import type {TestInfo} from '@playwright/test';
import {caminhoRelativoRun, gravarArquivoEvidenciaPreCr, registrarCtManifest} from './gravarEvidenciaPreCr';

function corpoJson(cTexto: string): unknown {
   try {
      return JSON.parse(cTexto);
   } catch {
      return cTexto;
   }
}

function gravarResumoApi(ctId: string, nStatus: number, cUrl: string): string | null {
   const id = ctId.toUpperCase();
   const resumo = [
      `# ${id}`,
      '',
      `- **HTTP:** ${nStatus}`,
      `- **URL:** ${cUrl}`,
      `- **Prova:** resposta da API conforme cenário.`,
      '',
   ].join('\n');
   return gravarArquivoEvidenciaPreCr(`${id}-resumo.md`, resumo, 'api');
}

/**
 * Evidência obrigatória no PASS — hop Dev QA_PRE_CR (PRE_CR=1).
 * Grava JSON + resumo .md em api/ e anexa no relatório Playwright.
 */
export async function evidenciarApiPreCr(
   testInfo: TestInfo,
   ctId: string,
   nStatus: number,
   cUrl: string,
   cCorpo: string,
): Promise<void> {
   if (process.env.PRE_CR !== '1') {
      return;
   }

   const id = ctId.toUpperCase();
   const nomeArquivo = `${id}-response.json`;
   const oPayload = {
      status: nStatus,
      url: cUrl,
      body: corpoJson(cCorpo),
   };
   const cJson = JSON.stringify(oPayload, null, 2);

   await testInfo.attach(nomeArquivo, {
      body: cJson,
      contentType: 'application/json',
   });

   const caminhoApi = gravarArquivoEvidenciaPreCr(nomeArquivo, cJson, 'api');
   const caminhoResumo = gravarResumoApi(id, nStatus, cUrl);

   registrarCtManifest(id, {
      api: caminhoRelativoRun(caminhoApi),
      screenshot: caminhoRelativoRun(caminhoResumo),
   });

   testInfo.annotations.push({
      type: 'evidencia-pass',
      description: `${id}: HTTP ${nStatus}`,
   });
}
