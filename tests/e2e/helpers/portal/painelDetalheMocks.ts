import {C_TOKEN_OK} from '../portalFixtures';
import type {RespostaDetalheOsMock} from './mockDetalheOsMinimo';

/** Painel com timeline — grade desktop + abas mobile (TALK-2671 / CT-E2E-01). */
export function detalheOsPainelComTimeline(
   cOsPublicId = C_TOKEN_OK,
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001047',
            cStatusDescricao: 'Produção - Em andamento',
            oCliente: {cNome: 'João', cSaudacao: 'Olá, João'},
            oBranding: {
               cLogoUrl: '/cliente-logo-placeholder.png',
               cNomeFantasia: 'Oficina E2E',
            },
            oTokensDerivados: {'--theme-action-primary': '#1a5276'},
            oVeiculo: {
               cPlaca: 'PQR1A23',
               cMarca: 'VW',
               cModelo: 'Gol',
               cAno: '2020',
            },
            mCarretas: [],
            lRetifica: false,
            lTemMotor: false,
            mChecklist: [],
            mServicos: [],
            mPecas: [],
            mTimeline: [
               {cFase: 'D', cDescricao: 'Diagnóstico', lAtual: false, lConcluida: true},
               {cFase: 'P', cDescricao: 'Produção', lAtual: true, lConcluida: false},
            ],
            mFotos: [],
            mAbasOrdem: ['checklist', 'servicos'],
         },
      },
   };
}

/** FR-016 — timeline vazia (CT-E2E-02 / paridade CT-SMK-06). */
export function detalheOsPainelSemTimeline(
   cOsPublicId = C_TOKEN_OK,
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001046',
            cStatusDescricao: 'Aguardando peças',
            oCliente: {cNome: 'Maria', cSaudacao: 'Olá, Maria'},
            oBranding: {
               cLogoUrl: '/cliente-logo-placeholder.png',
               cNomeFantasia: 'Oficina E2E',
            },
            oVeiculo: {
               cPlaca: 'XYZ9E99',
               cMarca: 'FIAT',
               cModelo: 'Argo',
               cAno: '2022',
            },
            mCarretas: [],
            lRetifica: false,
            lTemMotor: false,
            mChecklist: [],
            mServicos: [],
            mPecas: [],
            mTimeline: [],
            mFotos: [],
            mAbasOrdem: ['checklist', 'servicos'],
         },
      },
   };
}
