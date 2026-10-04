# Adega Pro

Sistema de gestão para adegas e conveniências.

## Aplicativo instalável

- **Web/PWA:** execute `bun run build`. Em navegadores compatíveis, o botão **Instalar App** adiciona o ADEGA PRO ao computador ou celular.
- **Desktop:** execute `bun run desktop:dev` durante o desenvolvimento.
- **Windows:** execute `bun run desktop:build:windows` em um ambiente Windows com Rust e WebView2. Os instaladores NSIS (`.exe`) e MSI são gerados em `src-tauri/target/release/bundle/`.

O aplicativo desktop utiliza o mesmo frontend e os mesmos serviços seguros da versão web. A instalação não transforma automaticamente todas as operações de banco em offline; dados pendentes dependem da estratégia de sincronização do módulo correspondente.
