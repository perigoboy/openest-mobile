# openest-mobile

📱 Openest Mobile App - Conexões Reais, Sem Julgamentos
O Openest é uma plataforma digital projetada especificamente para o público não-monogâmico, focada em oferecer um ambiente seguro, autêntico e livre de julgamentos.  
DOCX

Este repositório contém o código-fonte da aplicação mobile (iOS e Android), desenvolvida para expandir a experiência da nossa plataforma web nativamente para a palma da mão dos nossos utilizadores. O aplicativo devolve ao usuário o controle sobre sua privacidade através do "Modo Discreto", permite a criação de perfis detalhados com status de relacionamento específicos e conta com uma mecânica fluida de descoberta, matches por interesse mútuo e chat privado em tempo real.  
DOCX
+ 1

🚀 Principais Funcionalidades
Autenticação e Perfil: Login seguro e gerenciamento detalhado de perfil (fotos, bio e status de relacionamento).  
DOCX

Descoberta Interativa: Sistema de swipe (Curtir/Passar) com filtros avançados de busca (idade, localização, status).  
DOCX

Match Engine: Geração de conexões baseadas estritamente em interesse mútuo.  
DOCX

Chat em Tempo Real: Comunicação instantânea e privada com histórico protegido.  
DOCX

Privacidade por Design: "Modo Discreto" para ocultar o perfil em buscas públicas.  
DOCX

🛠️ Stack de Tecnologias
O ecossistema do Openest é dividido entre o aplicativo mobile (este repositório) e a nossa API.

Frontend Mobile (Este repositório)
React Native: Framework principal para a construção da interface nativa multiplataforma (iOS e Android).

Expo: Plataforma e ecossistema para acelerar o desenvolvimento, build e deploy nativo, garantindo uma configuração inicial limpa e do zero.

React Navigation: Gerenciamento de rotas e navegação fluida entre as abas (Descoberta, Chat, Perfil).

Axios: Cliente HTTP para comunicação e consumo da API RESTful.  
DOCX

Socket.io-client: Integração via WebSockets para o funcionamento do chat em tempo real.  
DOCX

Backend e Banco de Dados (API Externa)
Node.js & Express: Servidor principal e roteamento da API RESTful.  
DOCX

PostgreSQL: Banco de dados relacional escolhido pela sua robustez na integridade de dados e transações ACID.  
DOCX

Prisma ORM: Ferramenta de modelagem e comunicação segura com o banco de dados PostgreSQL.  
DOCX

Cloudinary: Serviço em nuvem utilizado para o armazenamento e otimização das fotos de perfil dos usuários.  
DOCX

👥 Equipa de Desenvolvimento
Este projeto foi desenvolvido de forma colaborativa para a componente curricular N392 - Projeto Aplicado Plataformas Web (Universidade de Fortaleza).  
DOCX

Ariel Sousa - 2412871  
DOCX

Eduardo Dourado - 2426049  
DOCX

Leandro Soares - 2422729  
DOCX

Lucas Figueredo - 2427447  
DOCX

Sob a supervisão do Prof. Bruno Lopes, Me.

  
DOCX

📂 Arquitetura e Organização do Projeto
Para manter a base de código escalável e limpa, adotamos uma estrutura centralizada no diretório src/:

Plaintext
openest-mobile/
├── src/
│   ├── assets/       # Imagens, ícones e fontes locais
│   ├── components/   # Componentes reutilizáveis (Botões, Cards, Inputs)
│   ├── contexts/     # Estados globais da aplicação (Autenticação, Tema)
│   ├── screens/      # Telas principais do aplicativo (Login, Discovery, Chat)
│   ├── services/     # Configuração do Axios, Socket.io e chamadas à API
│   └── utils/        # Funções de formatação, validação e helpers
├── App.js            # Ponto de entrada do Expo
├── app.json          # Configurações do aplicativo (Nome, Ícone, Splash Screen)
└── package.json      # Dependências do projeto
⚙️ Configuração do Ambiente e Instalação
Como a arquitetura exige um ambiente limpo e sem históricos de repositórios antigos, o projeto deve ser inicializado do zero.

Clone o repositório:

Bash
git clone https://github.com/SeuUsuario/openest-mobile.git
cd openest-mobile
Instale as dependências:

Bash
npm install
Configure as variáveis de ambiente:
Crie um ficheiro .env na raiz do projeto e aponte para o endereço da API local ou de produção:

Snippet de código
EXPO_PUBLIC_API_URL=http://localhost:3000
Inicie o ambiente de desenvolvimento (Expo):

Bash
npx expo start
🔀 Fluxo de Trabalho e Contribuição (Git Workflow)
Para garantir um desenvolvimento organizado entre a equipa, adotamos as seguintes regras de versionamento:

A branch main é sagrada: Nenhuma alteração é feita diretamente na main.

Criação de Branches: Todo o desenvolvimento deve ocorrer em branches isoladas, criadas a partir da main.

Funcionalidades novas: feat/nome-da-funcionalidade (ex: feat/chat-socket)

Correção de bugs: fix/nome-do-bug (ex: fix/login-crash)

Pull Requests (PRs): Após finalizar uma branch, crie um PR detalhado explicando as alterações. O PR deve ser revisto e aprovado por, pelo menos, um membro da equipa antes de fazer o merge.
