import fs from 'node:fs';
import path from 'node:path';
import type {TestInfo} from '@playwright/test';

/** Raiz da run: runs/atual/ — layout canônico smoke/prints, api/, jest/. */
export function pastaProvasRun(): string | null {
   if (process.env.PRE_CR !== '1') {
      return null;
   }
   const runDir = process.env.PRE_CR_RUN_DIR;
   if (!runDir) {
      return null;
   }
   fs.mkdirSync(runDir, {recursive: true});
   return runDir;
}

/**
 * Grava prova na run (ex.: smoke/prints/CT-SMK-01/01-lista.png ou api/CT-API-01-response.json).
 */
export function gravarArquivoEvidenciaPreCr(
   nomeArquivo: string,
   conteudo: Buffer | string,
   subpasta?: string,
): string | null {
   const dir = pastaProvasRun();
   if (!dir) {
      return null;
   }
   const destDir = subpasta ? path.join(dir, subpasta) : dir;
   fs.mkdirSync(destDir, {recursive: true});
   const dest = path.join(destDir, nomeArquivo);
   fs.writeFileSync(dest, conteudo);
   return dest;
}

export function registrarCtManifest(
   ctId: string,
   artefatos: {
      screenshot?: string | null;
      api?: string | null;
      video?: string | null;
      outputDir?: string | null;
   },
): void {
   const dir = pastaProvasRun();
   if (!dir) {
      return;
   }
   const manifestPath = path.join(dir, 'manifest-cts.jsonl');
   const linha = JSON.stringify({
      ctId,
      ...artefatos,
      em: new Date().toISOString(),
   });
   fs.appendFileSync(manifestPath, `${linha}\n`, 'utf8');
}

export function caminhoRelativoRun(caminhoAbsoluto: string | null): string | null {
   const runDir = process.env.PRE_CR_RUN_DIR;
   if (!runDir || !caminhoAbsoluto) {
      return null;
   }
   return path.relative(runDir, caminhoAbsoluto).replace(/\\/g, '/');
}

export function outputDirRelativo(testInfo: TestInfo): string | null {
   return path.relative(process.cwd(), testInfo.outputDir).replace(/\\/g, '/');
}
