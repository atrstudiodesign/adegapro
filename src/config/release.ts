export const APP_RELEASE = {
  releaseId: '2026-09-clientes-fiados-01',
  version: '1.9',
  dateLabel: '09/2026',
  title: 'Adega Pro atualizado',
  subtitle: 'Novidades desta versão',
  notes: [
    'Cadastro de clientes simplificado com Mensal/Avulso e WhatsApp obrigatório.',
    'Categorias e fornecedores sincronizados para o ambiente do cliente.',
    'Importação de produtos da planilha e catálogo demonstração com estoque inicial.',
    'Janelas nativas do navegador substituídas por modais próprios do Adega Pro.',
    'Ajustes de catálogo, estoque e compatibilidade do PDV.',
    'Área Clientes & Fiados separada em abas e novo tipo de cliente FIADO.'
  ]
} as const;

export const APP_VERSION_LABEL = `v${APP_RELEASE.version} · ${APP_RELEASE.dateLabel}`;
