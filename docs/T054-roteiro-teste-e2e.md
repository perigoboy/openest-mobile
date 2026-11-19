# T054 — Roteiro de teste ponta-a-ponta e geração do APK

Checagem final antes da apresentação do TCC. O roteiro cobre o caminho
completo do app: **Cadastro → Discovery → Match → Chat**.

---

## Antes de começar

| Item | Como conferir |
|---|---|
| API no ar | `npm run dev` na `openest-api` (porta 3000) |
| Celular e notebook no **mesmo Wi-Fi** | obrigatório — o app usa o IP da rede local |
| `EXPO_PUBLIC_API_URL` correto | no `.env` da `openest-mobile`, com o IPv4 do notebook (`ipconfig`), ex.: `http://192.168.1.4:3000` |
| Duas contas | o roteiro usa duas pessoas conversando; tenha um 2º aparelho ou o navegador (`openest-web`) para o outro lado |

> ⚠️ Se trocar o `EXPO_PUBLIC_API_URL`, é preciso **gerar o APK de novo** — a
> variável é embutida no build, não lida em tempo de execução.

---

## Parte 1 — Roteiro manual

Marque cada item. Qualquer `❌` vira issue antes da apresentação.

### 1. Cadastro
- [ ] Abrir o app: a tela de boas-vindas aparece sem travar.
- [ ] **Criar conta** com nome, e-mail e senha (mín. 6 caracteres).
- [ ] Cadastrar com um e-mail **já existente** → mensagem de erro clara (não trava).
- [ ] Cadastrar com senha curta (`123`) → erro de validação.
- [ ] Após o cadastro, o app entra direto (sem pedir login de novo).
- [ ] Sair e **fazer login** com a conta criada.
- [ ] Fechar e reabrir o app → continua logado.

### 2. Perfil
- [ ] Abrir **Perfil**: nome e e-mail corretos.
- [ ] Editar bio/cidade e salvar → voltar e reabrir a tela: o dado **persistiu**.
- [ ] Trocar a **foto** pela galeria → a imagem sobe e aparece no avatar.
- [ ] Ligar e desligar o **Modo Discreto** → o estado persiste ao reabrir.

### 3. Discovery
- [ ] A tela mostra cards de outras pessoas (nunca o seu próprio perfil).
- [ ] A **foto** do card carrega (não fica quebrada).
- [ ] **Passar** (✕) → o card sai e não volta ao recarregar.
- [ ] **Curtir** (♥) → o próximo card aparece.
- [ ] **Bloquear/denunciar** pelo menu → sem erro na tela, o perfil some.
- [ ] Atalho do **calendário** no topo abre a tela de Encontros.
- [ ] Acabando os perfis, aparece o estado vazio (não uma tela em branco).

### 4. Match
- [ ] Com a conta **A**, curtir a conta **B**.
- [ ] Com a conta **B**, curtir a conta **A**.
- [ ] O aviso de **match** aparece.
- [ ] A conversa aparece na lista de **Conversas** nos dois aparelhos.
- [ ] A lista mostra o **nome e a foto da outra pessoa** (nunca os seus).

### 5. Chat (o mais importante para a banca)
- [ ] Abrir a conversa: o histórico carrega.
- [ ] Enviar uma mensagem → aparece na hora do lado de A.
- [ ] A mensagem chega em **B sem precisar dar refresh**.
- [ ] **"digitando…"** aparece quando o outro escreve.
- [ ] Enviar **foto**, **GIF** e **localização**.
- [ ] **Apagar p/ mim** some só para você; **Apagar p/ todos** some nos dois.
- [ ] **Responder** uma mensagem mostra a citação.

#### 5.1 Confirmação de leitura (checks)
- [ ] Com B **offline**: a mensagem fica com **1 check cinza** (`✓`).
- [ ] B **abre o app**: vira **2 checks cinzas** (`✓✓`) — sem reiniciar nada.
- [ ] B **abre a conversa**: vira **2 checks azuis** (`✓✓`).
- [ ] Ligar o **Modo Discreto** em **qualquer uma** das contas → os checks
      param em **2 cinzas** e nunca ficam azuis, para os **dois** lados.
- [ ] Desligar o Modo Discreto → os azuis voltam a funcionar.

### 6. Encontros
- [ ] No chat, tocar no **calendário** e enviar um convite.
- [ ] O convite aparece como **card** (não como texto cru).
- [ ] B toca em **Aceitar** → vira "✅ Convite Aceite!" nos dois lados.
- [ ] O encontro aparece em **Encontros** com data/hora e **uma única vez**.
- [ ] **Salvar no Google Agenda** abre o calendário preenchido.
- [ ] **Desistir** → o card some **e não volta ao recarregar**.

### 7. Robustez
- [ ] Ativar o **modo avião** no meio do chat → aviso de conexão, app não quebra.
- [ ] Desativar → reconecta sozinho e sincroniza as mensagens.
- [ ] App em segundo plano e voltando → o chat continua atualizando.
- [ ] Girar a tela em algumas telas → nada quebra.

---

## Parte 2 — Gerar o APK (EAS)

### Pré-requisitos (uma vez)
```bash
npm install -g eas-cli      # ou use npx eas-cli
npx eas-cli login           # conta Expo da equipe
```

### Build
```bash
cd openest-mobile
npx eas-cli build -p android --profile preview
```

Na primeira execução o EAS pergunta se pode criar o projeto na conta e gerar
o **keystore** — responda **sim** nas duas (ele guarda e reutiliza depois).

O perfil `preview` está no `eas.json` e produz **`.apk`**
(`buildType: "apk"` + `distribution: "internal"`), que é o formato que
instala direto no aparelho. O perfil `production` gera `.aab`, que **não**
serve para instalar à mão.

### Instalar no celular
1. Ao terminar, o EAS mostra um **link de download** (e um QR code).
2. Abrir o link **no próprio celular** e baixar o `.apk`.
3. Autorizar *"instalar de fontes desconhecidas"* quando o Android pedir.
4. Abrir o app e repetir rapidamente os itens **1, 4 e 5.1** deste roteiro.

### Critério de aceite da issue
- [ ] `.apk` gerado com sucesso pelo EAS.
- [ ] Instalado em celular físico da equipe.
- [ ] Login, match e chat funcionando **pelo APK** (não só pelo Expo Go).

---

## Se algo falhar

| Sintoma | Causa provável |
|---|---|
| App abre mas **nenhuma** tela carrega dados | `EXPO_PUBLIC_API_URL` apontando para `localhost` ou IP antigo — corrigir e **rebuildar** |
| Funciona no Expo Go e falha no APK | o notebook e o celular saíram do mesmo Wi-Fi, ou a API não está rodando |
| Fotos não sobem | credenciais do Cloudinary no `.env` da API |
| Checks travados em 1 | a API em execução é uma instância **antiga** — reiniciar (`npm run dev`) |
| Build falha pedindo login | `npx eas-cli login` antes de buildar |

> O `app.json` já habilita `usesCleartextTraffic` no Android via
> `expo-build-properties`. Sem isso o APK instala, mas o Android bloqueia o
> `http://` da API local e **nenhuma requisição funciona**.
