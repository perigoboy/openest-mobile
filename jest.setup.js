// jest.setup.js
// Configuracoes globais de mock para os testes da suite de autenticacao.

// -------------------------------------------------------------
// 1. expo-secure-store
// -------------------------------------------------------------
// O modulo nativo nao roda no ambiente do Jest, entao mockamos
// com funcoes espiaveis que podemos controlar em cada teste.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// -------------------------------------------------------------
// 3. Alert do React Native
// -------------------------------------------------------------
// Espionamos o Alert.alert para verificar se foi chamado com
// as mensagens certas nos testes de tela.
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});

// -------------------------------------------------------------
// 4. Silenciar console.error esperado em testes de erro
// -------------------------------------------------------------
// O AuthContext usa console.error quando signIn/signOut falham.
// Em testes onde a falha e intencional, esse log polui a saida.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// -------------------------------------------------------------
// 5. react-native-gesture-handler + react-native-reanimated (T032)
// -------------------------------------------------------------
// RNGH: mocks do módulo nativo. O preset jest-expo já usa a chave
// `setupFiles`, então carregamos o jestSetup oficial daqui (os
// jest.mock registrados aqui valem antes de os testes importarem o lib).
require('react-native-gesture-handler/jestSetup');
// Reanimated 4: setup oficial de testes (guia "Testing with Jest") —
// fornece o runtime de UI simulado e matchers como toHaveAnimatedStyle.
require('react-native-reanimated').setUpTests();