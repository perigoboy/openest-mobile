# Testes E2E (End-to-End) - Openest Mobile

Este diretório contém os testes automatizados de ponta a ponta utilizando o **Maestro**.

## Pré-requisitos
1. Ter o **Java 17+** instalado (configurado na variável `JAVA_HOME`).
2. Ter o **Maestro CLI** instalado (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
3. Ter um **Emulador Android** rodando (ou um celular físico conectado via USB com depuração ativada).
4. O aplicativo Openest deve estar instalado no emulador (`npx expo start` e apertar `a`).

## Como rodar os testes
Com o emulador aberto e o app instalado, execute na raiz do projeto:

```bash
maestro test e2e/fluxo-critico.yaml