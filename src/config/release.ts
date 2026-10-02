export const APP_RELEASE = {
  releaseId: '2026-10-02-mini-pdv-fullscreen-v5.15',
  version: '5.15',
  dateLabel: '02/10/2026 · outubro · Mini PDV fullscreen',
  title: 'Adega Pro atualizado',
  subtitle: 'Novidades desta versão',
  notes: [
    'Mini PDV: novo modo de tela cheia com restauração rápida; ESC/fechar ficam protegidos quando existe venda em andamento e orientam finalizar ou cancelar antes de sair.',
    'Operação 24h: Mini PDV e PDV completo permanecem sincronizados por loja; PIN aceita teclado físico; dashboard mostra faturamento do dia e por turno; caixa ganhou estorno auditável de sangria/suprimento.',
    'Mini PDV: carregamento de produtos, estoque, vendas, clientes e caixa ficou resiliente a falhas isoladas de sincronização, preservando os dados já disponíveis para o vendedor.',
    'Vendas & cupons: nova tela de alteração permite corrigir a forma de pagamento registrada (Dinheiro, PIX, Débito, Crédito, Voucher ou Fiado) com sincronização do caixa.',
    'Vendas & cupons: ações administrativas para visualizar cupom, alterar desconto e cancelar venda com estorno sincronizado de estoque, caixa e financeiro.',
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
