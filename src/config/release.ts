export const APP_RELEASE = {
  releaseId: '2026-10-01-client-referral-v5.10',
  version: '5.10',
  dateLabel: '01/10/2026 · outubro · 17:44 BRT',
  title: 'Adega Pro atualizado',
  subtitle: 'Novidades desta versão',
  notes: [
    'Indicações: clientes ativos agora podem indicar novos clientes pelo Adega Pro, acompanhar status, pontos e cashback com sincronização direta ao ATR Control.',
    'PDV: pagamento em Cartão agora abre a escolha entre Débito e Crédito antes da finalização da venda.',
    'PIX manual por loja: QR Code configurado em Integrações e confirmação Pendente, Cancelado ou Pago antes de finalizar a venda.',
    'PDV e estoque: operações reforçadas por loja para manter vendas, caixa e saldo de estoque sincronizados na unidade ativa.',
    'Caixa: abertura, movimentações e fechamento permanecem vinculados à loja e ao operador responsável.',
    'Clientes & Fiados: cadastro e controle operacional continuam separados e vinculados ao ambiente da loja.',
    'Central de notificações do sistema reúne avisos operacionais do Adega Pro, incluindo estoque, validade e pendências de RH.',
    'Categorias, fornecedores, produtos e catálogo permanecem sincronizados com o ambiente operacional do cliente.',
    'Configurações e impressão concentram preferências de cupom, impressora e operação da loja.'
  ]} as const;

export const APP_VERSION_LABEL = `v${APP_RELEASE.version} · ${APP_RELEASE.dateLabel}`;
