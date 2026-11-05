import type {RespostaDetalheOsMock} from './mockDetalheOsMinimo';
import {detalheOsMinimoE2E} from './mockDetalheOsMinimo';
import {C_TOKEN_ABAS_FILTRADAS} from '../portalFixtures';

/** Detalhe mock T2770 — só abas checklist e peças (paridade mock-bff.mjs). */
export function detalheOsAbasFiltradasE2E(
   cOsPublicId = C_TOKEN_ABAS_FILTRADAS,
): RespostaDetalheOsMock {
   const oBase = detalheOsMinimoE2E(cOsPublicId, 'Oficina Abas Filtradas');
   return {
      ...oBase,
      oDados: {
         oOrdemServico: {
            ...oBase.oDados.oOrdemServico,
            mAbasOrdem: ['checklist', 'pecas'],
            mChecklist: [{cDescricao: 'Item checklist E2E', nQuantidade: 1}],
            mServicos: [
               {
                  cSecao: 'Serviços ocultos na aba',
                  mItens: [
                     {
                        cDescricao: 'Não deve aparecer na tablist',
                        nQuantidade: 1,
                        nQuantidadeTempo: 0,
                        lCortesia: false,
                        lNaoAprovado: false,
                     },
                  ],
               },
            ],
            mPecas: [],
         },
      },
   };
}
