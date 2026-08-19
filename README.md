# 📱 Openest Mobile App - Conexões Reais, Sem Julgamentos

O **Openest** é uma plataforma digital projetada especificamente para o público não-monogâmico, focada em oferecer um ambiente seguro, autêntico e livre de julgamentos. 

Este repositório contém o código-fonte da aplicação mobile (iOS e Android), desenvolvida para expandir a experiência da nossa plataforma web nativamente para a palma da mão dos nossos utilizadores. O aplicativo devolve ao usuário o controle sobre sua privacidade através do "Modo Discreto", permite a criação de perfis detalhados com status de relacionamento específicos e conta com uma mecânica fluida de descoberta, matches por interesse mútuo e chat privado em tempo real.

---

## 🚀 Principais Funcionalidades

* **Autenticação e Perfil:** Login seguro e gerenciamento detalhado de perfil (fotos, bio e status de relacionamento).
* **Descoberta Interativa:** Sistema de *swipe* (Curtir/Passar) com filtros avançados de busca (idade, localização, status).
* **Match Engine:** Geração de conexões baseadas estritamente em interesse mútuo.
* **Chat em Tempo Real:** Comunicação instantânea e privada com histórico protegido.
* **Privacidade por Design:** "Modo Discreto" para ocultar o perfil em buscas públicas.

---

## 🛠️ Stack de Tecnologias

### Frontend Mobile (Este repositório)
* **React Native:** Framework para construção da interface nativa multiplataforma (iOS e Android).
* **Expo:** Plataforma e ecossistema para acelerar o desenvolvimento, build e deploy nativo.
* **React Navigation:** Gerenciamento de rotas e navegação fluida entre abas.
* **Axios:** Cliente HTTP para comunicação e consumo da API RESTful.
* **Socket.io-client:** Integração via WebSockets para chat em tempo real.

### Backend e Banco de Dados (API Externa)
* **Node.js & Express:** Servidor principal e roteamento da API RESTful.
* **PostgreSQL:** Banco de dados relacional com suporte a transações ACID.
* **Prisma ORM:** Modelagem e comunicação com o banco de dados PostgreSQL.
* **Cloudinary:** Armazenamento e otimização das fotos de perfil.

---

## 👥 Equipe de Desenvolvimento

Projeto desenvolvido para a disciplina N392 - Projeto Aplicado Plataformas Web (Universidade de Fortaleza).

* **Ariel Sousa** - 2412871
* **Eduardo Dourado** - 2426049
* **Leandro Soares** - 2422729
* **Lucas Figueredo** - 2427447

> *Supervisor: Prof. Bruno Lopes, Me.*

---

## 📂 Arquitetura do Projeto

## 📂 Arquitetura do Projeto

```text
openest-mobile/
├── src/
│   ├── assets/       # Imagens, ícones e fontes locais
│   ├── components/   # Componentes reutilizáveis (Botões, Cards, Inputs)
│   ├── contexts/     # Estados globais (Autenticação, Tema)
│   ├── screens/      # Telas (Login, Discovery, Chat, Perfil)
│   ├── services/     # Configurações do Axios e Socket.io
│   └── utils/        # Helpers e validações
├── App.js            # Entry point do Expo
├── app.json          # Metadados do app (Splash, ícones)
└── package.json      # Dependências
```

---

## ⚙️ Instalação e Execução

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SeuUsuario/openest-mobile.git
   cd openest-mobile
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npx expo start
   ```

---

## 🔀 Fluxo Git (Branching & PRs)

* **Branch principal:** `main` (protegida para builds estáveis).
* **Padrão de Branches:**
  * **Novas features:** `feat/nome-da-funcionalidade`
  * **Correções de bugs:** `fix/nome-do-bug`
* **Pull Requests:** Obrigatórios para merge na `main`, necessitando de pelo menos uma aprovação da equipe.