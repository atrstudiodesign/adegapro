# ADEGA PRO — P0 / P1 / P2 / P3

## P0 — Segurança e integridade transacional
- [x] Rate limit pré-auth em Edge Function.
- [x] PIN interno com hash bcrypt.
- [x] Sessão temporária de operador com token armazenado apenas como hash no servidor.
- [x] Bloqueio progressivo de PIN.
- [x] Venda transacional no servidor.
- [x] Caixa seguro por RPC.
- [x] Escrita direta bloqueada em tabelas transacionais.
- [x] Colunas sensíveis protegidas.
- [x] Operador vinculado a venda/caixa.
- [x] Módulos locais bloqueados em PRODUÇÃO quando ainda não migrados.

## P1 — Migração funcional para Supabase
- [x] Loja e logo.
- [x] Categorias.
- [x] Fornecedores.
- [x] Produtos.
- [x] Clientes e recebimento de fiado.
- [x] Operadores.
- [x] PDV.
- [x] Caixa.
- [x] Estoque e ajustes.
- [x] Compras.
- [x] Inventário físico.
- [x] Histórico de vendas.
- [x] Financeiro base.
- [x] Relatórios base.
- [x] Auditoria.
- [x] Suporte.
- [ ] Combos em produção: bloqueados até implementar baixa de componentes.
- [ ] Mini dashboard específico do caixa: usa o dashboard geral de produção até migração dedicada.

## P2 — Qualidade, governança e CI/CD
- [x] Branch google-ai-studio.
- [x] CI com TypeScript, testes e build.
- [x] CODEOWNERS.
- [x] Testes de identidade jurídica e guardas arquiteturais.
- [x] Documentação de arquitetura.
- [ ] Proteção obrigatória da main: depende de configuração administrativa do GitHub; o conector atual não expõe escrita de branch protection.

## P3 — Integrações e escala
- [x] Produção impede simulação TEF/fiscal/offline como se fossem reais.
- [x] Tela de capacidades de produção informa claramente homologações pendentes.
- [x] PWA não promete sincronização offline que ainda não existe.
- [ ] PSP PIX com cobrança dinâmica e webhook assinado.
- [ ] TEF homologado.
- [ ] Emissão NFC-e real/homologada.
- [ ] Offline transacional real com IndexedDB/outbox/idempotência.
- [ ] Billing/gateway de assinatura.
- [ ] Control Plane completo da ATR Studio para licenças, tenants e suporte.
