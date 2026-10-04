# ADEGA PRO Legacy — Windows 7

Esta variante existe somente para máquinas que ainda executam Windows 7.

## Arquitetura

- Shell desktop: Electron 22.3.27.
- Aplicação carregada: https://adegapro.vercel.app
- Backend, autenticação, estoque, caixa, financeiro e demais dados: os mesmos serviços usados pelo ADEGA PRO Online.
- A branch `main` e o desktop Tauri atual não são alterados.

## Motivo

O executável Tauri/Rust atual depende de APIs indisponíveis no Windows 7. A edição Legacy evita rebaixar ou modificar a aplicação principal.

## Segurança

O processo renderer:
- não possui Node.js;
- usa `contextIsolation`;
- usa `sandbox`;
- expõe somente o comando necessário para abrir módulos em janelas separadas;
- envia links externos para o navegador padrão.

## Atualização funcional

Como o shell carrega a aplicação de produção, atualizações do ADEGA PRO Online passam a aparecer no Legacy sem reinstalar o executável, desde que a alteração web continue compatível com Chromium 108/Electron 22.

## Limitação

Windows 7 e Electron 22 estão fora de suporte de segurança dos fabricantes. Esta edição deve ser tratada como compatibilidade temporária, não como plataforma principal.


## Homologação operacional

A edição Legacy é um shell **online**. Em produção, vendas, abertura/fechamento de caixa,
sangrias, estoque, financeiro e usuários continuam sendo processados pelas mesmas RPCs e
tabelas do ADEGA PRO Online.

Critério de homologação:

- conexão ativa com a internet;
- login da conta principal seguido do PIN do operador;
- venda finalizada por `finalize_sale`;
- caixa aberto/fechado pelas RPCs seguras de produção;
- nenhuma base de dados de produção adicional dentro do executável Legacy;
- bundle web compilado para Chromium 108.

O modo offline local existente no projeto pertence ao ambiente Demo/local e **não deve ser
tratado como sincronização offline homologada da produção**.
