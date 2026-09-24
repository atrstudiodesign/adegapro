# ADEGA PRO — Arquitetura de Produção

Atualizado em 23/09/2026.

## Princípio central

O modo DEMO pode usar dados locais fictícios. O modo PRODUÇÃO não deve gravar operações reais em localStorage. Toda operação de produção deve passar por Supabase Auth, RLS e RPCs/serviços transacionais.

## Camadas

1. **Entrada SaaS** — apresentação, login, cadastro e recuperação.
2. **Aceite jurídico** — documentos versionados e aceite persistido.
3. **Operador interno** — PIN com bcrypt no servidor, bloqueio progressivo e sessão interna temporária.
4. **Frontend React/PWA** — telas responsivas.
5. **Production Repository** — única porta de acesso do frontend aos dados reais.
6. **Supabase/PostgreSQL** — fonte única da verdade, multi-tenant com RLS.
7. **RPCs transacionais** — venda, caixa, compras, inventário, recebimentos e ajustes.
8. **Storage** — logos e arquivos controlados por tenant.
9. **Edge Functions** — operações pré-auth ou integrações que exijam segredos/IP do servidor.

## Regras de segurança

- Nenhum PIN em texto puro no banco ou frontend.
- Tokens internos de operador são armazenados somente como hash no servidor.
- Escritas financeiras e operacionais críticas não são feitas diretamente em tabelas.
- tenant_id e store_id não são reassociáveis pelo cliente.
- Rate limit pré-auth ocorre em Edge Function com hash de identificador/IP.
- Segredos de TEF, PSP PIX, certificado fiscal e webhooks nunca residem no navegador.
- Módulos ainda não migrados ficam bloqueados em PRODUÇÃO em vez de cair silenciosamente no banco local.

## Fluxo de venda real

Auth Supabase → aceite legal → PIN do operador → sessão de operador → sessão de caixa → finalize_sale() → validações → venda + itens + pagamentos + estoque + caixa + financeiro + auditoria em transação única.

## Fluxo de compras

Operador autorizado → confirm_purchase() → compra + itens + entrada de estoque + custo + financeiro/conta a pagar em transação única.

## Fluxo de inventário

Operador autorizado → inventário aberto → contagem → finalize_inventory_audit() → divergências + ajustes de estoque + movimentações auditadas.

## CI/CD

- main: fonte oficial de produção.
- google-ai-studio: branch separada para alterações externas.
- Pull Requests devem passar por TypeScript, testes e build.
- Vercel publica main.
- CODEOWNERS exige revisão da ATR Studio nos caminhos críticos quando a proteção da branch for ativada.

## Integrações externas

PIX automático, TEF, NFC-e e offline transacional permanecem bloqueados/não homologados até existir provedor real, credenciais seguras e testes de integração. O modo DEMO pode demonstrar fluxos simulados, mas PRODUÇÃO não deve simular autorização financeira ou fiscal.
