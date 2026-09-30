export const APP_RELEASE = {
  releaseId: '2026-09-pdv-sara-search-03',
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
    'Área Clientes & Fiados separada em abas e novo tipo de cliente FIADO.',
    'Novo programa de indicação na landing page com benefícios comerciais para clientes ativos.',
    'Política de indicação e comissionamento comercial detalhada nos termos do Adega Pro.',
    'PDV passa a abrir para consulta mesmo sem caixa, Mini PDV permanece ativo e a busca foi sincronizada globalmente.'
  ]
} as const;

export const APP_VERSION_LABEL = `v${APP_RELEASE.version} · ${APP_RELEASE.dateLabel}`;
