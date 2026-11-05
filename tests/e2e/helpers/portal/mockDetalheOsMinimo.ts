import {tokenPortalOk} from '../portalFixtures';

export type RespostaDetalheOsMock = {
   lSucesso: boolean;
   cMensagem: string;
   oDados: {
      oOrdemServico: Record<string, unknown>;
   };
};

export function detalheOsMinimoE2E(
   cOsPublicId = tokenPortalOk(),
   cNomeFantasia = 'Oficina E2E',
): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId,
            cNumeroOs: '001045',
            cStatusDescricao: 'Em andamento',
            oBranding: {
               cNomeFantasia,
               cLogoUrl: '/cliente-logo-placeholder.png',
            },
            oTokensDerivados: {
               '--theme-action-primary': '#1a5276',
               '--theme-action-secondary': '#ffffff',
            },
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

export function detalheOsD4v2Mock(): RespostaDetalheOsMock {
   return {
      lSucesso: true,
      cMensagem: 'OK',
      oDados: {
         oOrdemServico: {
            cOsPublicId: 'tokOsD4v2XXXXXXXXXXXXXX',
            cNumeroOs: '001045',
            cStatusDescricao: 'Em andamento',
            oBranding: {
               cNomeFantasia: 'Oficina Certtus',
               cLogoUrl: '/cliente-logo-placeholder.png',
            },
            oTokensDerivados: {
               '--theme-action-primary': '#009FFD',
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
            mTimeline: [],
            mFotos: [],
            mAbasOrdem: ['checklist'],
         },
      },
   };
}
