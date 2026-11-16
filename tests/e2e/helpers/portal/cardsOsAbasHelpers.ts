import {expect, type Page} from '@playwright/test';

export type CenarioPreviewOs =
   | 'vazio'
   | 'checklist-2'
   | 'muitos-itens'
   | 'foto-quebrada'
   | 'erro'
   | 'malformado';

const C_FRASES_VAZIO: Record<'checklist' | 'fotos' | 'servicos' | 'pecas', RegExp> = {
   checklist: /Nenhum item de checklist registrado/,
   servicos: /Nenhum serviço registrado/,
   pecas: /Nenhuma peça registrada/,
   fotos: /Ainda não há fotos disponíveis/,
};

export async function abrirPreviewOs(page: Page, cCenario: CenarioPreviewOs): Promise<void> {
   await page.goto(`/preview/os?cenario=${encodeURIComponent(cCenario)}`);
   await page.waitForLoadState('domcontentloaded');
   await expect(page.getByTestId('painel-abas-os')).toBeVisible({timeout: 20_000});
}

export async function clicarAbaOs(
   page: Page,
   cAba: 'checklist' | 'fotos' | 'servicos' | 'pecas',
): Promise<void> {
   await page.getByTestId(`aba-os-${cAba}`).click();
}

export async function alturaPainelAbasPx(page: Page): Promise<number> {
   const oBox = await page.getByTestId('painel-abas-os').boundingBox();
   return oBox?.height ?? 0;
}

export async function expectPainelSemRolagemInterna(page: Page): Promise<void> {
   const oOverflow = await page.getByTestId('painel-abas-os').evaluate((el) => {
      const oStyle = window.getComputedStyle(el);
      return {
         overflowY: oStyle.overflowY,
         scrollHeight: el.scrollHeight,
         clientHeight: el.clientHeight,
      };
   });
   expect(oOverflow.overflowY, 'overflowY do painel').not.toMatch(/auto|scroll/);
}

export async function percorrerAbasVaziasEFrases(page: Page): Promise<number[]> {
   const mAlturas: number[] = [];
   for (const cAba of ['checklist', 'servicos', 'pecas', 'fotos'] as const) {
      await clicarAbaOs(page, cAba);
      await expect(page.getByText(C_FRASES_VAZIO[cAba])).toBeVisible();
      mAlturas.push(await alturaPainelAbasPx(page));
   }
   return mAlturas;
}

export function expectAlturasProximas(mAlturas: number[], nToleranciaPx = 24): void {
   const nMin = Math.min(...mAlturas);
   const nMax = Math.max(...mAlturas);
   expect(nMax - nMin, 'variação de altura entre abas vazias').toBeLessThanOrEqual(nToleranciaPx);
}