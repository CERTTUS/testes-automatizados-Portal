import {test as setup} from '@playwright/test';
import './preCrGlobalHooks';

setup('registrar hooks QA_PRE_CR', async () => {
   // afterEach registrado via side-effect em preCrGlobalHooks.ts
});
