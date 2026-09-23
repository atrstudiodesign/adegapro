# ADEGA PRO — Auditoria Técnica e de Segurança

Data: 23/09/2026

## Resumo executivo

O sistema possui uma base funcional de interface e regras de negócio, porém **a persistência atual não é um banco de dados de produção**. Os dados são gravados no `localStorage` do navegador por meio de `src/services/db.ts`.

Isso significa que, no estado atual:

- os dados ficam vinculados ao navegador/dispositivo;
- limpar os dados do navegador pode apagar a operação;
- usuários de máquinas diferentes não compartilham uma fonte central confiável;
- não existe isolamento multi-tenant real no servidor;
- permissões são aplicadas principalmente no cliente;
- logs podem ser alterados ou apagados pelo próprio navegador;
- backup JSON contém dados sensíveis;
- integrações não devem armazenar segredos reais no frontend.

## Achados críticos

### 1. Persistência local em vez de banco de dados
**Severidade: CRÍTICA**

`getStorage` e `setStorage` usam `window.localStorage`.

Correção necessária:
- PostgreSQL/Supabase dedicado ao Adega Pro;
- autenticação real;
- RLS por tenant/loja;
- migrations;
- API/Edge Functions para operações sensíveis;
- storage para logos e arquivos.

### 2. PIN armazenado em texto puro
**Severidade: CRÍTICA**

O tipo `User` possui `pin: string` e o PIN é persistido diretamente no armazenamento local.

Correção necessária:
- PIN com hash no backend;
- nunca retornar hash/PIN ao cliente;
- endpoint de autenticação específico;
- rate limit e bloqueio após tentativas inválidas.

### 3. Troca de usuário sem autenticação
**Severidade: CRÍTICA — corrigido na interface**

O cabeçalho permitia selecionar outro usuário diretamente, sem PIN.

Correção aplicada:
- remoção do seletor direto;
- troca deve ocorrer pelo modal de autenticação por PIN.

Ainda é necessário enforcement no backend.

### 4. PIN exposto na tela
**Severidade: ALTA — corrigido na interface**

A tela de funcionários exibia o PIN em texto.

Correção aplicada:
- PIN mascarado;
- login não exibe PIN padrão.

### 5. Auditoria não é imutável
**Severidade: ALTA**

Os logs ficam em localStorage, limitados a 500 registros, com IP fixo `127.0.0.1`.

Correção necessária:
- tabela append-only no backend;
- políticas impedindo update/delete por usuários da aplicação;
- IP capturado no servidor;
- user agent, tenant, store, entidade, ação e metadata;
- retenção definida por política.

### 6. Multi-tenant apenas no frontend
**Severidade: CRÍTICA**

Os métodos filtram por `tenantId`, mas todos os dados permanecem acessíveis no cliente.

Correção necessária:
- RLS no PostgreSQL;
- tenant derivado da sessão autenticada;
- proibir tenantId arbitrário vindo do frontend.

### 7. Segredos de integração no cliente
**Severidade: CRÍTICA**

Configurações PIX/TEF/Fiscal possuem campos de segredos na tipagem e persistência local.

Correção necessária:
- segredos somente no servidor / variáveis protegidas;
- frontend recebe apenas status e identificadores não sensíveis;
- webhooks validados no backend.

### 8. Backup JSON sensível
**Severidade: ALTA**

`exportAllData()` exporta usuários, integrações, vendas, clientes e outros dados.

Correção necessária:
- permissão específica;
- arquivo criptografado ou exportação seletiva;
- nunca exportar PINs/hashes/secrets;
- registrar a exportação em auditoria.

## Copyright e vazamento

Em aplicações web não existe bloqueio absoluto de screenshot.

Estratégia recomendada:
- watermark dinâmica com loja + usuário + data/hora;
- marca d'água em áreas sensíveis e exportações;
- ocultação ao perder foco opcional;
- mascaramento de dados;
- RBAC no backend;
- logs de visualização/exportação;
- restrição nativa de captura somente em app instalado/plataforma que suporte.

Não depender de:
- bloquear F12;
- bloquear botão direito;
- interceptar PrintScreen;
- JavaScript para impedir screenshot.

## Estrutura de telas

Correções aplicadas:
- Categorias agora possui tela própria;
- Fornecedores agora possui tela própria;
- Cadastro da Adega separado da Configuração do Sistema;
- logo da loja separado da marca Adega Pro;
- suporte ATR Studio adicionado ao menu;
- créditos de desenvolvimento adicionados.

## Próxima etapa obrigatória antes de produção

1. Criar projeto Supabase/PostgreSQL dedicado ao Adega Pro.
2. Criar schema multi-tenant.
3. Migrar dados de localStorage.
4. Implementar Auth + RLS.
5. Mover ações críticas para backend.
6. Remover segredos do frontend.
7. Implementar auditoria append-only.
8. Configurar storage de logos.
9. Testar isolamento entre tenants.
10. Só então liberar dados reais de clientes e pagamentos.
