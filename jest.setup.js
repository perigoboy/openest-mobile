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
// 2. AsyncStorage (preferência de tema) e Haptics (feedback tátil)
// -------------------------------------------------------------
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-screen-capture', () => ({
  usePreventScreenCapture: jest.fn(),
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
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

// Reanimated 4: setup oficial de testes (guia "Testing with Jest") —
// fornece o runtime de UI simulado e matchers como toHaveAnimatedStyle.
require('react-native-reanimated').setUpTests();