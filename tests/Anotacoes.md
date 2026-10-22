# Anotações — Testes

> **Responsável:** Leandro
> **Status:** ✅ Sprint 2 concluída (30/30) · ✅ Sprint 3 concluída (11/11) · ✅ Sprint 4 concluída (6/6 novos)
> **Última atualização:** Sprint 4

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
- `react-native-gesture-handler` (setup oficial via `jestSetup` — Sprint 4)
- `react-native-reanimated` (setup oficial via `setUpTests` — Sprint 4)

### 8. `Switch` também perde handler no re-render (Sprint 3)

Descoberto nos testes de Modo Discreto (T026). O `<Switch>` do
React Native sofre do **mesmo problema que o `TouchableOpacity`**
(seção 3): depois de um re-render, `el.props.onValueChange` pode
vir `undefined`.

**Solução:** usar **sempre** `fireEvent(el, "valueChange", valor)`
em vez de chamar `el.props.onValueChange(valor)` direto.

Pra **inspecionar** `props.value` depois de um re-render,
**re-buscar o elemento** com `screen.getByTestId(...)` — não
guardar referência antiga.

### 9. Mocks específicos do `Profile.test.js` (Sprint 3)

Quando o teste renderiza telas que usam esses módulos, eles
precisam de mock:

- `expo-linear-gradient` → mock simples: `LinearGradient = View`
- `@expo/vector-icons` → mock simples: `Ionicons = Text`
- `expo-image-picker` → mock dos métodos
- `../../src/components` (barrel) → mock dos componentes internos
- `../../src/services/api` → mock com `get` e `patch` como `jest.fn()`
- `../../src/services/uploadPhoto` e `../../src/services/profilePhotos` → mocks dos named exports

### 10. Testes de Funções Puras (Sprint 4)

Na Sprint 4 (Discovery Engine), a maior parte da lógica de negócios
(filtros, normalização) foi extraída para **funções puras** que não
dependem de React, API ou estado.

**Solução:** Não precisamos de `render()`, `act()` ou mocks complexos.
Basta importar a função, passar os dados mockados e verificar o retorno.

```js
import { applyPreferences } from "../../../src/screens/Discovery";
import { MOCK_PROFILES } from "../../../src/screens/Discovery/mockProfiles";

const filtered = applyPreferences(MOCK_PROFILES, prefs, userLocation);
expect(filtered).toHaveLength(2);
```

---

## 🧪 Estado atual dos testes

```text
tests/
├── smoke.test.js
├── contexts/
│   └── AuthContext.test.js
├── components/
│   ├── DiscoveryCard.test.js
│   └── PhotoGallery.test.js
├── screens/
│   ├── Login.test.js
│   ├── Register.test.js
│   ├── Profile.test.js
│   ├── PhotoVerification.test.js
│   ├── Settings.test.js
│   ├── SearchPreferences.test.js
│   ├── Discovery.test.js
│   └── Discovery/
│       └── applyPreferences.test.js  (Sprint 4 / T035)
└── services/
    ├── discovery.test.js
    ├── profilePhotos.test.js
    ├── searchPreferences.test.js
    └── userLocation.test.js
```

- **Suíte completa (fim da Sprint 4):** 16 suítes, **145 testes**, 100% passando.

---

## 📋 Cobertura por arquivo

| Arquivo | O que cobre |
|---|---|
| `AuthContext.test.js` | `signIn`, `signUp`, `signOut`, boot com/sem token |
| `Login.test.js` | Validações, submit, erro, navegação |
| `Register.test.js` | Validações, LGPD, submit, erros, submitting |
| `Profile.test.js` | **T022:** Modo Discreto (toggle, PATCH, rollback). **T019:** `handleSave` (stub). |
| `DiscoveryCard.test.js` | Renderização visual do card (T029). |
| `PhotoGallery.test.js` | Grid de fotos (T021). |
| `PhotoVerification.test.js` | Selfie check (T023). |
| `Settings.test.js` | Tela de configurações (T025). |
| `SearchPreferences.test.js` | Filtros de busca (T027). |
| `Discovery.test.js` | Tela do Discovery (T030/T032). |
| `applyPreferences.test.js` | **T035:** Filtros puros (`applyPreferences`): idade, gênero, distância. |
| `discovery.test.js` | **T030:** `buildSearchParams`, `normalizeProfile`, `fetchCompatibleProfiles`. |
| `profilePhotos.test.js` | Service de fotos do perfil. |
| `searchPreferences.test.js` | `sanitizePreferences`, `load`, `save` (local + backend). |
| `userLocation.test.js` | Cálculo de distância/Haversine (T028). |

---

## 🎯 Comandos úteis

```bash
npm test                                    # roda tudo
npm test -- tests/screens/Login.test.js     # roda um arquivo
npm test -- --watch                         # modo watch
npm test -- --coverage                      # relatório de cobertura
```

---

## 💡 Próximas sprints — o que fazer

- Novos testes de tela → seguir o padrão do `Register.test.js`.
- Novos testes de componente com `Switch` → seguir seção 8.
- Novos testes de contexto → seguir o padrão do `AuthContext.test.js`.
- Novos testes de funções puras → seguir seção 10 (sem mocks, sem render).
- Novos mocks de módulos nativos → registrar no `moduleNameMapper`.
- Sempre **Ctrl+S** antes de rodar testes.
- Nunca rodar `npm audit fix --force` (quebra o Expo).
- **Cuidado com o clipboard do VS Code** — arquivos grandes estão sendo truncados ao copiar/colar em chats. Preferir **anexar o arquivo**.

---

## 📌 Histórico de sprints

### Sprint 2 — Autenticação

- **Task:** Cobrir com testes unitários as regras críticas de login/cadastro.
- **Entregue:** 30 testes (AuthContext 6, Login 8, Register 14, smoke 2).
- **Descobertas:** 7 peculiaridades (seções 1 a 7).
- **Status:** ✅ Concluída.

### Sprint 3 — Perfil e Privacidade

- **Task:** T026 — Testes de Perfil e Privacidade.
- **Entregue:** 11 testes em `tests/screens/Profile.test.js`.
- **Descobertas:** 2 peculiaridades novas (seções 8 e 9).
- **Status:** ✅ Concluída.

### Sprint 4 — Discovery Engine

- **Task:** T035 — Testes automatizados do Discovery Engine.
- **Entregue:** 6 testes em `tests/screens/Discovery/applyPreferences.test.js` cobrindo a função pura `applyPreferences` (filtros de idade, gênero e distância).
- **Descobertas:** 1 peculiaridade nova (seção 10). A suíte completa chegou a 145 testes.
- **Status:** ⚠️ Parcialmente concluída — filtragem testada, mas **cache e undo pendentes**.

---

## ⚠️ Pendências herdadas e bloqueios

- **T019 (edição de perfil):** `handleSave` no `Profile` é stub (só Alert). Teste cobre o comportamento atual.
- **T033 (cache de vistos) e T034 (undo):** **NÃO FORAM IMPLEMENTADAS**. O `Discovery/index.js` não possui lógica de histórico nem botão "Desfazer". Os testes dessas features, pedidos na T035, **ficam bloqueados** até que o código seja entregue. Sinalizado ao time.