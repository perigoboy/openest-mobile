// tests/App.test.js
// Smoke test do App completo: providers + navegação + deep linking + banner
// de rede + splash montados juntos. Pega erros de "fiação" (import errado,
// provider fora de ordem, rota inexistente) que os testes isolados não veem.
import React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import App from "../App";
import { hasNetworkErrorHandler } from "../src/services/networkErrors";
import { connectSocket } from "../src/services/socket";

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  setOptions: jest.fn(),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-notifications", () => {
  const listeners = new Set();
  return {
    setNotificationHandler: jest.fn(),
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponse: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((cb) => {
      listeners.add(cb);
      return { remove: () => listeners.delete(cb) };
    }),
    __tap: (data) => listeners.forEach((cb) => cb({ notification: { request: { content: { data } } } })),
  };
});

jest.mock("expo-linking", () => ({
  createURL: (path) => `openest://${String(path).replace(/^\//, "")}`,
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("../src/services/notifications", () => ({
  configureNotificationHandler: jest.fn(),
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue(null),
  unregisterPushNotificationsAsync: jest.fn().mockResolvedValue(false),
  areNotificationsEnabled: jest.fn().mockResolvedValue(true),
  presentLocalNotification: jest.fn(),
  buildLocalNotificationFromSocket: jest.fn(),
}));

jest.mock("../src/services/socket", () => ({
  SOCKET_EVENTS: { NOTIFICATION: "notification", NEW_MATCH: "new_match" },
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
  getSocket: () => null,
  onSocketEvent: () => () => {},
}));

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { BlurView: View };
});
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

// Telas da área logada substituídas por versões simples (cada uma tem
// testes próprios); aqui interessa a navegação entre elas.
jest.mock("../src/screens/Discovery", () => {
  const { Text } = require("react-native");
  return () => <Text>tela Descobrir</Text>;
});
jest.mock("../src/screens/Matches", () => {
  const { Text } = require("react-native");
  return () => <Text>tela Conversas</Text>;
});
jest.mock("../src/screens/Chat", () => {
  const { Text } = require("react-native");
  return ({ route }) => <Text>tela Chat {route?.params?.conversationId}</Text>;
});
jest.mock("../src/screens/Profile", () => () => null);
jest.mock("../src/screens/Settings", () => () => null);
jest.mock("../src/screens/SearchPreferences", () => () => null);
jest.mock("../src/screens/PhotoVerification", () => () => null);
jest.mock("../src/screens/Encontros", () => () => null);

// Chamados no carregamento do módulo App.js (antes de qualquer teste).
const splashKeptAtLoad = SplashScreen.preventAutoHideAsync.mock.calls.length;
const notificationHandlerConfiguredAtLoad =
  require("../src/services/notifications").configureNotificationHandler.mock.calls.length;

function storeSession(session) {
  SecureStore.getItemAsync.mockImplementation(async (key) => session[key] ?? null);
}

beforeEach(() => {
  jest.clearAllMocks();
  storeSession({});
});

describe("App (smoke)", () => {
  it("sem sessão: mostra o Login, esconde a splash e liga o banner de rede", async () => {
    render(<App />);

    expect(await screen.findByText("Faça login para continuar")).toBeTruthy();
    expect(splashKeptAtLoad).toBe(1);
    expect(notificationHandlerConfiguredAtLoad).toBe(1);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(hasNetworkErrorHandler()).toBe(true);
    expect(connectSocket).not.toHaveBeenCalled();
  });

  it("com sessão: vai para a área logada e conecta o tempo real com o JWT", async () => {
    storeSession({ user_token: "jwt-real", user_data: JSON.stringify({ id: "me", name: "Eu" }) });
    render(<App />);

    expect(await screen.findByText("tela Descobrir")).toBeTruthy();
    await waitFor(() => expect(connectSocket).toHaveBeenCalledWith("jwt-real"));
    expect(screen.getByLabelText("Conversas")).toBeTruthy();
  });

  it("T049: tocar numa notificação com o app aberto leva direto ao Chat certo", async () => {
    storeSession({ user_token: "jwt-real", user_data: JSON.stringify({ id: "me", name: "Eu" }) });
    render(<App />);
    await screen.findByText("tela Descobrir");

    await act(async () => {
      Notifications.__tap({ type: "message", conversationId: "42" });
    });

    expect(await screen.findByText("tela Chat 42")).toBeTruthy();
  });

  it("T049: app fechado aberto pela notificação já abre no Chat (depois de ler a sessão)", async () => {
    Notifications.getLastNotificationResponse.mockReturnValue({
      notification: { request: { content: { data: { type: "message", conversationId: "7" } } } },
    });
    storeSession({ user_token: "jwt-real", user_data: JSON.stringify({ id: "me", name: "Eu" }) });
    render(<App />);

    expect(await screen.findByText("tela Chat 7")).toBeTruthy();
  });
});
