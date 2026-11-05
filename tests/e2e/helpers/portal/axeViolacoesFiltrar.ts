import {expect} from '@playwright/test';
import type {Result} from 'axe-core';

/** Tags WCAG 2.2 AA usadas nos scans axe. */
export const C_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'] as const;

const C_IMPACTOS_BLOQUEANTES = new Set(['critical', 'serious']);

export function axeViolacoesFiltrar(mViolacoes: Result[]): Result[] {
   return mViolacoes.filter(
      (oViolacao) =>
         oViolacao.impact != null && C_IMPACTOS_BLOQUEANTES.has(oViolacao.impact),
   );
}

export function axeViolacoesFormatar(mViolacoes: Result[]): string {
   return mViolacoes
      .map(
         (oViolacao) =>
            `[${oViolacao.impact}] ${oViolacao.id}: ${oViolacao.description}\n` +
            `  help: ${oViolacao.helpUrl}\n` +
            `  nodes: ${oViolacao.nodes.map((oNode) => oNode.target.join(' > ')).join('; ')}`,
      )
      .join('\n\n');
}

type AxeAnalyzeResult = {
   violations: Result[];
};

export function expectAxeSemCriticalSerious(oResultado: AxeAnalyzeResult): void {
   const mFiltradas = axeViolacoesFiltrar(oResultado.violations);
   expect(mFiltradas, axeViolacoesFormatar(mFiltradas)).toEqual([]);
}
