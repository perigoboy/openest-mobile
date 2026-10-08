# Anotações — Testes

> **Responsável:** Leandro
> **Status:** ✅ Sprint 2 concluída — 30/30 testes · ✅ Sprint 3 (T026) concluída — 11/11 testes
> **Última atualização:** Sprint 3

---

## ⚠️ Peculiaridades do ambiente (LER ANTES DE MEXER)

Cada sprint revelou comportamentos não-óbvios do ecossistema
Expo SDK 57 + React 19 + Jest + testing-library. **Anotado aqui pra
não perdermos tempo de novo nas próximas sprints.**

### 1. Versão da testing-library — NÃO ATUALIZAR

Estamos em `@testing-library/react-native@13.3.3`.

**NÃO atualizar pra v14.** A v14 introduziu `render` assíncrono
que causa "overlapping act() calls" com React 19 + Expo SDK 57.
Bug conhecido e ainda não corrigido.

Quando a v14 estabilizar, podemos migrar — mas por enquanto
fica a v13.

### 2. `@react-native/jest-preset` — instalar manualmente

A partir do RN 0.85+, o Jest preset do React Native foi movido
pra um pacote separado. O `jest-expo` precisa dele como peer
dependency, mas o `npm` não instala automaticamente.

**Se clonar o repo do zero e o `npm test` reclamar disso:**

```bash
npx expo install @react-native/jest-preset
```

### 3. Mock obrigatório do TouchableOpacity

O `fireEvent.press` do testing-library **NÃO** dispara o `onPress`
do `TouchableOpacity` no Expo SDK 57 + React 19. O `onPress`
simplesmente **desaparece das props** do elemento renderizado.

**Solução:** colocar esse mock no topo de todo arquivo de teste
que usa `<TouchableOpacity>`:

```js
jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mocked = React.forwardRef((props, ref) => {
    const { children, onPress, disabled, testID, style, accessibilityRole } = props;
    return React.createElement(View, {
      ref, testID,
      accessibilityRole: accessibilityRole || 'button',
      accessibilityState: { disabled: !!disabled },
      style,
      onPress: disabled ? undefined : onPress,
    }, children);
  });
  Mocked.displayName = 'TouchableOpacity';
  return { __esModule: true, default: Mocked, TouchableOpacity: Mocked };
});
```

### 4. Mock do AuthContext — instância única

Ao mockar o `useAuth`, o `jest.fn()` deve ser definido **FORA**
do `jest.mock` pra que a **mesma instância** seja usada no teste
**E** no componente. Caso contrário, cada chamada a `useAuth()`
cria um `jest.fn()` novo, e o teste não enxerga as chamadas
do componente.

```js
const mockSignIn = jest.fn();   // ← FORA

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),  // ← usa a mesma ref
}));
```

### 5. Disparar cliques — NÃO usar `fireEvent.press`

Como o `onPress` do `TouchableOpacity` é perdido no render
(problema 3), `fireEvent.press` também não funciona. Use o
helper abaixo:

```js
async function pressButton(testID) {
  const el = screen.getByTestId(testID);
  await act(async () => {
    if (typeof el.props.onPress === 'function') {
      await el.props.onPress();
    }
  });
}
```

Pra testes com Promise pendurada (ex: testar estado
"submitting"), chame sem `await`:

```js
act(() => { btn.props.onPress(); });
```

### 6. `moduleNameMapper` para mocks de módulos nativos

O `package.json` tem uma seção que redireciona imports de módulos
nativos para arquivos de mock locais:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "moduleNameMapper": {
    "^react-native-safe-area-context$": "<rootDir>/tests/mocks/react-native-safe-area-context.js",
    "@react-native-picker/picker": "<rootDir>/tests/mocks/react-native-picker.js"
  },
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

Novos módulos nativos que precisarem de mock: criar arquivo
em `tests/mocks/` e adicionar uma linha no `moduleNameMapper`.

### 7. `jest.setup.js` — mocks globais

Arquivo `jest.setup.js` na raiz do projeto contém mocks que rodam
antes de todos os testes:

- `expo-secure-store` (`getItemAsync`, `setItemAsync`, `deleteItemAsync`)
- `Alert.alert` (spy — pode ser inspecionado em qualquer teste)
- `console.error` (silenciado pra não poluir a saída — só pra erros
  esperados em testes de falha)

### 8. `Switch` também perde handler no re-render (novo — Sprint 3)

Descoberto nos testes de Modo Discreto (T026). O `<Switch>` do
React Native sofre do **mesmo problema que o `TouchableOpacity`**
(seção 3): depois de um re-render, `el.props.onValueChange` pode
vir `undefined`.

**Solução:** usar **sempre** `fireEvent(el, "valueChange", valor)`
em vez de chamar `el.props.onValueChange(valor)` direto.

Pra **inspecionar** `props.value` depois de um re-render,
**re-buscar o elemento** com `screen.getByTestId(...)` — não
guardar referência antiga:

```js
// ❌ Não faça isso
const sw = screen.getByTestId("switch-modo-discreto");
act(() => { sw.props.onValueChange(true); });  // pode falhar
// ...
sw.props.onValueChange(false);  // ❌ sw é referência velha

// ✅ Faça isso
const sw1 = screen.getByTestId("switch-modo-discreto");
fireEvent(sw1, "valueChange", true);
await act(async () => {});  // flush de microtasks

const sw2 = screen.getByTestId("switch-modo-discreto");  // re-busca
fireEvent(sw2, "valueChange", false);
```

### 9. Mocks específicos do `Profile.test.js` (novo — Sprint 3)

Quando o teste renderiza telas que usam esses módulos, eles
precisam de mock:

- `expo-linear-gradient` → mock simples: `LinearGradient = View`
- `@expo/vector-icons` → mock simples: `Ionicons = Text`
- `expo-image-picker` → mock dos métodos (`requestMediaLibraryPermissionsAsync`, `requestCameraPermissionsAsync`, `launchImageLibraryAsync`, `launchCameraAsync`)
- `../../src/components` (barrel) → mock dos componentes internos (`Avatar`, `PhotoGallery`, `VerifiedBadge`)
- `../../src/services/api` → mock com `get` e `patch` como `jest.fn()` (**mesma instância**, ver seção 4)
- `../../src/services/uploadPhoto` e `../../src/services/profilePhotos` → mocks dos named exports

Exemplo genérico:

```js
jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("../../src/components", () => ({
  Avatar: () => null,
  PhotoGallery: () => null,
  VerifiedBadge: () => null,
}));

jest.mock("../../src/services/profilePhotos", () => ({
  MAX_PROFILE_PHOTOS: 6,
  addPhoto: jest.fn((list, url) => [...list, url]),
  movePhoto: jest.fn((list) => list),
  photosFromProfile: jest.fn(() => []),
  persistProfilePhotos: jest.fn(async () => {}),
  removePhoto: jest.fn((list) => list),
  sanitizePhotos: jest.fn((list) => list),
  setMainPhoto: jest.fn((list) => list),
}));
```

---

## 🐛 Regressões conhecidas (fora do escopo das sprints de teste)

### Register — 14 testes quebrados após refactor `31233a4`

O commit `31233a4` ("implement new register screen prototype")
reescreveu a tela de Register e:

- Removeu **todos** os `testID`s (`input-name`, `input-email`, `input-password`, `btn-submit`, `link-login`, `link-terms`, `checkbox-terms`)
- Removeu checkbox de LGPD (`checkbox-terms`)
- Removeu link "Já tem uma conta?" (`link-login`)
- Removeu link de Termos de Uso (`link-terms`)
- Trocou `signUp` do `AuthContext` por `api.post` direto em `/api/users/register`
- Mudou textos do botão de `"Cadastrar"/"Cadastrando..."` para `"CADASTRE-SE"/"CADASTRANDO..."`

**Impacto:** 10 dos 14 testes de `tests/screens/Register.test.js` quebram.

**Status:** sinalizado ao time (T026, Sprint 3). Aguardando decisão sobre
reverter o refactor ou atualizar o teste. **Fora do escopo da T026.**

---

## 🧪 Estado atual dos testes

```text
tests/
├── smoke.test.js                    (2 testes — infra)
├── contexts/
│   └── AuthContext.test.js          (6 testes)
├── screens/
│   ├── Login.test.js                (8 testes)
│   ├── Register.test.js             (14 testes — ⚠️ quebrados por refactor 31233a4)
│   └── Profile.test.js              (11 testes — Sprint 3 / T026)
└── mocks/
    ├── react-native-safe-area-context.js
    └── react-native-picker.js
```

- **Sprint 2:** 30 testes, 100% passando.
- **Sprint 3:** 11 testes novos (Profile), 100% passando.
- **Suíte completa:** 41 testes, com 10 falhas herdadas do Register (fora do escopo).

---

## 📋 Cobertura por arquivo

| Arquivo | O que cobre |
|---|---|
| `AuthContext.test.js` | `signIn` (sucesso + erro), `signUp` (auto-login), `signOut`, boot com/sem token |
| `Login.test.js` | Validações de campos vazios, trim, submit válido, erro de login, navegação |
| `Register.test.js` | Validações obrigatórias, senha mínima, consentimento LGPD, submit, erros do backend, submitting, navegação |
| `Profile.test.js` | **T022:** toggle on/off do Modo Discreto, PATCH à API, impacto do backend no Alert, rollback em erro, mensagem default de erro, bloqueio de toggle concorrente. **T019:** `handleSave` (comportamento atual/stub — apenas Alert de sucesso) |

---

## 🎯 Comandos úteis

```bash
npm test                                    # roda tudo
npm test -- tests/screens/Login.test.js     # roda um arquivo
npm test -- --watch                         # modo watch
npm test -- --coverage                      # relatório de cobertura
npm test -- tests/screens/Register.test.js -t "nome do teste"   # roda um teste específico

# Rodar só os testes relevantes pra T026 (excluindo o Register quebrado):
npm test -- tests/screens/Profile.test.js tests/contexts/AuthContext.test.js tests/screens/Login.test.js tests/smoke.test.js
```

---

## 💡 Próximas sprints — o que fazer

- Novos testes de tela → seguir o padrão do `Register.test.js` (mock `TouchableOpacity` + mock `useAuth` com instância única + helper `pressButton`).
- Novos testes de componente com `Switch` → seguir seção 8 (usar `fireEvent(el, "valueChange", valor)` e re-buscar o elemento).
- Novos testes de contexto → seguir o padrão do `AuthContext.test.js`.
- Novos mocks de módulos nativos → criar arquivo em `tests/mocks/` e registrar no `moduleNameMapper` do `package.json`.
- Se atualizar a testing-library → rodar `npm test` inteiro **ANTES e DEPOIS** pra garantir que nada quebrou.
- Sempre **Ctrl+S** antes de rodar testes (parece bobo, mas já perdemos tempo com isso).
- Nunca rodar `npm audit fix --force` (quebra o Expo).
- **Cuidado com o clipboard do VS Code** — arquivos grandes (`Profile/index.js`, `Anotacoes.md`) estão sendo truncados ao copiar/colar em chats. Preferir **anexar o arquivo** ao compartilhar.

---

## 📌 Histórico de sprints

### Sprint 2 — Autenticação

- **Task:** Cobrir com testes unitários as regras críticas de login/cadastro.
- **Entregue:** 30 testes (AuthContext 6, Login 8, Register 14, smoke 2).
- **Descobertas:** 7 peculiaridades do ambiente documentadas acima (seções 1 a 7).
- **Status:** ✅ PR aberto com evidências.

### Sprint 3 — Perfil e Privacidade

- **Task:** T026 — Escrever testes automatizados de Perfil e Privacidade.
- **Entregue:** 11 testes em `tests/screens/Profile.test.js` cobrindo Modo Discreto (T022) e edição de perfil (T019 — comportamento atual/stub).
- **Descobertas:** 2 peculiaridades novas (seções 8 e 9) + regressão do Register documentada.
- **Status:** ✅ Concluída — 11/11 testes passando.

---

## ⚠️ Pendências herdadas

- **Register.test.js:** 10 testes quebrados por refactor `31233a4`. Fora do escopo da T026. Sinalizado ao time.
- **T019 (edição de perfil):** o `handleSave` no `Profile/index.js` foi entregue como stub (só Alert, sem `api.patch`). Não há lógica de atualização pra testar. O teste atual cobre o comportamento existente; quando a T019 for implementada de verdade, o teste precisa ser atualizado.