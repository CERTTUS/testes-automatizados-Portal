import {C_TOKEN_OK} from '../portalFixtures';
import type {RespostaDetalheOsMock} from './mockDetalheOsMinimo';

/** Caminho feliz TALK-2670 — alinhado a CT-SMK-05. */
export function detalheOsConteudoCompleto(
   cOsPublicId = C_TOKEN_OK,
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001045',
            cStatusDescricao: 'Produção - Em andamento',
            oCliente: {cNome: 'Carlos', cSaudacao: 'Olá, Carlos'},
            cCondicoesTexto: 'IMPORTANTE:\n1 - Leia com atenção.',
            oBranding: {
               cLogoUrl: '/cliente-logo-placeholder.png',
               cNomeFantasia: 'Oficina E2E',
               cCnpj: '12.345.678/0001-99',
               cEndereco: 'Rua Teste, 100',
               cTelefone: '(11) 99999-0000',
            },
            oTokensDerivados: {'--theme-action-primary': '#1a5276'},
            oVeiculo: {
               cPlaca: 'ABC1D23',
               cMarca: 'VW',
               cModelo: 'Modelo E2E',
               cAno: '2019',
            },
            mCarretas: [],
            lRetifica: false,
            lTemMotor: false,
            mChecklist: [],
            mServicos: [],
            mPecas: [],
            mTimeline: [
               {cFase: 'P', cDescricao: 'Produção', lAtual: true, lConcluida: false},
            ],
            mFotos: [],
            mAbasOrdem: ['checklist'],
         },
      },
   };
}

/** Fail-open: sem saudação, condições nem branding cadastral. */
export function detalheOsFailOpenSemSaudacaoCondicoes(
   cOsPublicId = C_TOKEN_OK,
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001045',
            cStatusDescricao: 'Produção - Em andamento',
            oCliente: {cNome: 'Cliente', cSaudacao: '   '},
            cCondicoesTexto: '  ',
            oVeiculo: {
               cPlaca: 'ABC1D23',
               cMarca: 'VW',
               cModelo: 'Modelo E2E',
               cAno: '2019',
            },
            mCarretas: [],
            lRetifica: false,
            lTemMotor: false,
            mChecklist: [],
            mServicos: [],
            mPecas: [],
            mTimeline: [],
            mFotos: [],
            mAbasOrdem: ['checklist'],
         },
      },
   };
}

/** Subtítulo da saudação pela fase `lAtual` quando status vazio. */
export function detalheOsSubtituloPorTimeline(
   cOsPublicId = C_TOKEN_OK,
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001045',
            cStatusDescricao: '   ',
            oCliente: {cNome: 'Ana', cSaudacao: 'Olá, Ana'},
            oBranding: {
               cNomeFantasia: 'Oficina E2E',
               cLogoUrl: '/cliente-logo-placeholder.png',
            },
            oVeiculo: {
               cPlaca: 'ABC1D23',
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
               {
                  cFase: 'A',
                  cDescricao: 'Aguardando peças',
                  lAtual: true,
                  lConcluida: false,
               },
            ],
            mFotos: [],
            mAbasOrdem: ['checklist'],
         },
      },
   };
}
