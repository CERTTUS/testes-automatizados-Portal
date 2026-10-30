import {test} from '@playwright/test';

/**
 * Cenário não aplicável (massa/ambiente). `test.skip` — não conta como falha de produto.
 */
export function pularSeNaoAplicavel(lAplicavel: boolean, cMotivo: string): void {
   test.skip(!lAplicavel, cMotivo);
}
