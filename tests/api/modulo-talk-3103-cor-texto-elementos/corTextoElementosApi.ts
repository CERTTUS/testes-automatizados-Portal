// Massa do stub MS (scripts/qa/stub-ms-portal-landing.mjs) usada pelo módulo modulo-talk-3103-cor-texto-elementos.
export const C_TOKEN_TEXTO_PERSONALIZADO = 'tokTextoPersonalizadoT3103';
export const C_TOKEN_TEXTO_AUTOMATICO = 'tokTextoAutomaticoT3103';
export const C_TOKEN_TEXTO_LEGADO = 'tokTextoLegadoT3103';
export const C_TOKEN_TEXTO_INVALIDO = 'tokTextoInvalidoT3103';
export const C_TOKEN_CARDS_SEPARADOS = 'tokCardsSeparadosT3103';

export const M_CHAVES_TEXTO_ELEMENTO = [
   'loginBotaoTexto',
   'authCabecalhoTexto',
   'authFundoTexto',
   'authCardTexto',
   'authRodapeTexto',
   'acaoDestaqueTexto',
] as const;

export const M_CHAVES_CARD = [
   'loginCampo',
   'loginCampoTexto',
   'authCardRelatorio',
   'authCardRelatorioTexto',
   'authCardEvolucao',
   'authCardEvolucaoTexto',
   'authCardAbas',
   'authCardAbasTexto',
   'authCardHistorico',
   'authCardHistoricoTexto',
   'authJanelaDados',
   'authJanelaDadosTexto',
] as const;

// Mesmos objetos que o stub manda (caixa e valores idênticos).
export const O_TEMA_TEXTO_PERSONALIZADO: Record<string, string | null> = {
   editor: 'avancado',
   loginFundo: '#FFF7E6',
   loginTexto: '#7A2E00',
   loginBotao: '#7A2E00',
   loginBotaoTexto: '#FFE8CC',
   authCabecalho: '#0F3D73',
   authCabecalhoTexto: '#FFD166',
   authFundo: '#F4F4F4',
   authFundoTexto: '#1B4332',
   authCard: '#FFFFFF',
   authCardTexto: '#5A189A',
   authRodape: '#1B4332',
   authRodapeTexto: '#D8F3DC',
   acaoDestaque: '#C1121F',
   acaoDestaqueTexto: '#FFF1F2',
   loginCampo: '#FFF1C2',
   loginCampoTexto: '#5C3B00',
   authCardRelatorio: '#0F3D73',
   authCardRelatorioTexto: '#FFFFFF',
   authCardEvolucao: '#E8F5E9',
   authCardEvolucaoTexto: '#1B4332',
   authCardAbas: '#FDECEC',
   authCardAbasTexto: '#7F1D1D',
   authCardHistorico: '#EDE7F6',
   authCardHistoricoTexto: '#4A148C',
   authJanelaDados: '#263238',
   authJanelaDadosTexto: '#ECEFF1',
};

export const O_TEMA_TEXTO_AUTOMATICO: Record<string, string | null> = {
   editor: 'avancado',
   loginFundo: '#0F3D73',
   loginTexto: '#171717',
   authCabecalho: '#1C1C1C',
   authFundo: '#262626',
   authCard: '#0F3D73',
   authRodape: '#1C1C1C',
   ...Object.fromEntries(M_CHAVES_TEXTO_ELEMENTO.map((cChave) => [cChave, null])),
   ...Object.fromEntries(M_CHAVES_CARD.map((cChave) => [cChave, null])),
};

export const O_TEMA_TEXTO_LEGADO: Record<string, string> = {
   editor: 'avancado',
   loginTexto: '#E0E0E0',
   loginFundo: '#171717',
   authCabecalho: '#1C1C1C',
   authFundo: '#262626',
   authCard: '#FFFFFF',
   authRodape: '#1C1C1C',
};

export const O_TEMA_TEXTO_INVALIDO: Record<string, string> = {
   editor: 'avancado',
   authCard: '#FFFFFF',
   authCardTexto: 'roxo',
   authRodapeTexto: '#12345',
   acaoDestaqueTexto: 'rgb(255, 0, 0)',
};

export const O_TEMA_CARDS_SEPARADOS: Record<string, string> = {
   editor: 'avancado',
   authCard: '#FFFFFF',
   loginCampo: '#FFF1C2',
   loginCampoTexto: '#5C3B00',
   authCardRelatorio: '#0F3D73',
   authCardRelatorioTexto: '#FFFFFF',
   authCardEvolucao: '#E8F5E9',
   authCardEvolucaoTexto: '#1B4332',
   authCardAbas: '#FDECEC',
   authCardHistorico: '#EDE7F6',
   authCardHistoricoTexto: '#4A148C',
   authJanelaDados: '#263238',
};

// Chaves de card (sem o campo do login) que o tema CARDS_SEPARADOS grava: 8, pois abas e Meus dados não têm texto.
export const M_CHAVES_CARDS_SEPARADOS_GRAVADAS = [
   'authCardRelatorio',
   'authCardRelatorioTexto',
   'authCardEvolucao',
   'authCardEvolucaoTexto',
   'authCardAbas',
   'authCardHistorico',
   'authCardHistoricoTexto',
   'authJanelaDados',
] as const;
