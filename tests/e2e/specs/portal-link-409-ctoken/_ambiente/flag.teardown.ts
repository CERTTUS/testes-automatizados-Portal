import {test as teardown} from '@playwright/test';
import {restaurarFlagPortal} from '../../../helpers/portalFlagDb';
import {listarOsCriadasDoRun} from '../../../helpers/portalGuard';

/** Projeto `portal-link-409-teardown`: roda mesmo com falha nos specs; lista as OS criadas e restaura a flag. */
teardown('Restaurar a flag do Portal da empresa 0001 ao valor original e listar as OS criadas', async () => {
   const aOs = listarOsCriadasDoRun();
   for (const oReg of aOs) {
      console.log(
         `[portal-link-409] OS criada nesta execução: spec=${oReg.spec} empresa=${oReg.empresa} os=${oReg.ordemServico} serie=${oReg.serie} ` +
            `link=${oReg.encerramento} (OS segue aberta no ERP; marcador "${oReg.marcador}").`,
      );
   }
   const oRes = await restaurarFlagPortal();
   console.log(
      oRes.restaurado
         ? `[portal-link-409] portalclienteutilizar restaurado ao original (${oRes.original}).`
         : '[portal-link-409] nada a restaurar (sem estado ou referência ainda em uso).',
   );
});
