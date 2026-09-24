# Checklist de redesign ADEGA PRO

Branch de trabalho: `feat/visual-refresh-products`

A produção em `main` permanece separada até a validação final do preview.

## P0 — Marca, shell e base visual

- [x] Nova marca ADEGA PRO em SVG escalável.
- [x] Marca reduzida para navegação/favicon.
- [x] Favicon apontando para a nova marca.
- [x] Manifesto PWA sem referência aos ícones legados.
- [x] Plus Jakarta Sans para interface e JetBrains Mono para valores/códigos.
- [x] Tokens visuais preto/grafite/dourado.
- [x] Header premium.
- [x] Sidebar premium e responsiva.
- [x] Loja de produção carregada pelo contexto real do tenant.
- [x] Status de ambiente/online/atenção no header.
- [x] Caixa, operador, PIN, bloqueio e alertas no header.
- [x] ATR Control permanece fora do runtime operacional.

## P1 — Dashboard, produtos e PDV

- [x] Dashboard com vendas hoje, faturamento e ticket médio.
- [x] Clientes, estoque baixo, validade, caixas abertos, contas a pagar e receber.
- [x] Receita dos últimos 7 dias.
- [x] Canais de venda.
- [x] Formas de pagamento.
- [x] Produtos mais vendidos.
- [x] Categorias mais vendidas.
- [x] Alertas operacionais.
- [x] Catálogo de produtos em grade estilo e-commerce.
- [x] Alternância grade/lista.
- [x] Foto, nome, marca, apresentação/volume, categoria, SKU, EAN, custo, preço, margem, estoque e status.
- [x] Busca e filtros.
- [x] Combos e itens gelados identificados visualmente.
- [x] Upload, troca e remoção de foto.
- [x] Compressão para WebP antes do upload.
- [x] Storage privado por tenant/produto.
- [x] URLs de imagem assinadas temporariamente.
- [x] PDV produção com catálogo visual e fotos.
- [x] Categorias rápidas no PDV.
- [x] Busca por nome, marca, EAN e SKU.
- [x] Foto do produto no carrinho.
- [x] Finalização transacional existente preservada.

## P2 — Operação e gestão

- [x] Compras e entrada em fluxo Nota → Fornecedor → Produtos → Lotes → Validades → Custos → Preços → Conferência.
- [x] Chave NF-e e status interno de conferência.
- [x] Prazo/vencimento financeiro.
- [x] Lote e validade por item.
- [x] Alerta de vencimento em 30 dias.
- [x] Troca de preço destacada antes da confirmação.
- [x] Detalhes completos da entrada.
- [x] Estoque com foto, mínimo, máximo, preço, custo e próxima validade conhecida.
- [x] Estados crítico, baixo, normal e excesso.
- [x] Ajuste auditado de estoque preservado.
- [x] Clientes em cards com busca, limite, fiado, compras e cobrança por WhatsApp.
- [x] Financeiro com receitas, despesas, saldo, contas a pagar/receber e vencimentos.
- [x] Vendas e cupons com visual atualizado e acesso a detalhes.
- [x] Caixa e sessões com visual atualizado.
- [x] Inventário físico com contexto visual dos produtos.
- [x] Categorias, fornecedores, combos, operadores, auditoria, suporte e perfil da loja alinhados ao design system.

## P3 — Relatórios e integrações

- [x] Relatórios com faturamento, ticket, estoque, despesas e quantidade de vendas.
- [x] Gráfico de receita de 7 dias.
- [x] Mix de pagamentos.
- [x] Ranking de produtos.
- [x] Ranking de categorias.
- [x] Cards de iFood, Asaas, PagSeguro, Mercado Pago, SmartPOS/TEF e fiscal.
- [x] Estados NÃO CONFIGURADO, CONFIGURANDO, HOMOLOGAÇÃO PENDENTE, CONECTADO e ERRO baseados na configuração real.
- [x] Configuração de webhook HTTPS.
- [x] Modos HMAC, Bearer, Basic e sem autenticação.
- [x] Segredos reais mantidos fora do frontend; somente referência persistida.
- [x] Nenhuma integração é apresentada como funcional sem homologação real.

## Segurança e isolamento

- [x] Consultas de produção continuam vinculadas ao tenant/store autenticado.
- [x] Bucket de imagem privado e isolado por tenant.
- [x] Sem service role no navegador.
- [x] ATR Control usa cliente e sessão separados.
- [x] Runtime da adega não carrega funções de administração da plataforma.
- [x] Regras transacionais de venda, caixa, estoque e compra foram preservadas.
- [x] Nenhum KPI de produção usa valores fictícios.

## Imagens reais

- [x] DEMO recebeu fotografias reais para os produtos em que foi localizada referência adequada.
- [x] Nenhuma fotografia de produto foi gerada por IA.
- [x] Produtos sem referência confiável permanecem com placeholder neutro, sem fabricar embalagem falsa.
- [x] Fontes do DEMO documentadas em `docs/PRODUCT_IMAGE_CREDITS.md`.
- [x] Produção aceita somente upload do tenant; não copia automaticamente imagens de busca.

## Limites deliberados

- Reserva de estoque, giro calculado e custo médio histórico não são exibidos como se existissem quando o modelo atual não fornece esses dados.
- Manifestação oficial de NF-e depende de SEFAZ/provedor homologado.
- Envio automático de valor para máquina/SmartPOS depende de API e homologação do adquirente.
- iFood, Asaas, PagSeguro e Mercado Pago só passam a CONECTADO após integração real e teste bem-sucedido.
- A branch de redesign não deve ser promovida para `main` até o preview final compilar e ser revisado.
