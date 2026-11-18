// tests/services/notifications.test.js — T048 (Push Notifications)
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import api from "../../src/services/api";
import {
  PUSH_TOKEN_KEY,
  buildLocalNotificationFromSocket,
  configureNotificationHandler,
  presentLocalNotification,
  registerForPushNotificationsAsync,
  setNotificationsEnabledAsync,
  shouldPresentNotification,
  unregisterPushNotificationsAsync,
} from "../../src/services/notifications";
import { clearActiveConversation, setActiveConversation } from "../../src/services/activeConversation";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 6 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("id"),
}));

jest.mock("expo-device", () => {
  const state = { isDevice: true };
  return {
    __esModule: true,
    get isDevice() {
      return state.isDevice;
    },
    __state: state,
  };
});

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "proj-123" } } } },
}));

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: { post: jest.fn(), delete: jest.fn() },
}));

const deviceState = require("expo-device").__state;
const TOKEN = "ExponentPushToken[abc123]";

function storeReturns(values) {
  SecureStore.getItemAsync.mockImplementation(async (key) => (key in values ? values[key] : null));
}

beforeEach(() => {
  jest.clearAllMocks();
  clearActiveConversation();
  deviceState.isDevice = true;
  Constants.expoConfig = { extra: { eas: { projectId: "proj-123" } } };
  storeReturns({});
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: TOKEN });
  api.post.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

describe("registerForPushNotificationsAsync", () => {
  it("obtém o token com o projectId e registra na API (sem banner de erro global)", async () => {
    await expect(registerForPushNotificationsAsync()).resolves.toBe(TOKEN);

    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-123" });
    expect(api.post).toHaveBeenCalledWith(
      "/api/users/push-token",
      { token: TOKEN, platform: Platform.OS },
      { skipGlobalErrorHandler: true }
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PUSH_TOKEN_KEY, TOKEN);
  });

  it("pede permissão quando ainda não foi concedida", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined", canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: "granted" });

    await expect(registerForPushNotificationsAsync()).resolves.toBe(TOKEN);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it("permissão negada: não registra nada", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined", canAskAgain: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: "denied" });

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("não insiste quando o sistema não deixa perguntar de novo", async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: false });

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("emulador não recebe push remoto", async () => {
    deviceState.isDevice = false;
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("sem projectId do EAS avisa e segue sem push", async () => {
    Constants.expoConfig = {};
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("eas init"));
    warn.mockRestore();
  });

  it("respeita a preferência desligada nas Configurações", async () => {
    storeReturns({ notifications_enabled: "false" });

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("nunca lança, mesmo se a API estiver fora (não pode quebrar o login)", async () => {
    api.post.mockRejectedValue(new Error("Network Error"));
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(PUSH_TOKEN_KEY, TOKEN);
  });
});

describe("unregisterPushNotificationsAsync", () => {
  it("remove o token salvo na API e no aparelho", async () => {
    storeReturns({ [PUSH_TOKEN_KEY]: TOKEN });

    await expect(unregisterPushNotificationsAsync()).resolves.toBe(true);
    expect(api.delete).toHaveBeenCalledWith("/api/users/push-token", {
      data: { token: TOKEN },
      skipGlobalErrorHandler: true,
    });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(PUSH_TOKEN_KEY);
  });

  it("sem token salvo não chama a API", async () => {
    await expect(unregisterPushNotificationsAsync()).resolves.toBe(false);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("nunca lança (o logout precisa continuar)", async () => {
    storeReturns({ [PUSH_TOKEN_KEY]: TOKEN });
    api.delete.mockRejectedValue(new Error("offline"));
    await expect(unregisterPushNotificationsAsync()).resolves.toBe(false);
  });
});

describe("setNotificationsEnabledAsync (Switch das Configurações)", () => {
  it("ligar registra o push", async () => {
    await expect(setNotificationsEnabledAsync(true)).resolves.toBe(TOKEN);
  });

  it("desligar remove o push", async () => {
    storeReturns({ [PUSH_TOKEN_KEY]: TOKEN, notifications_enabled: "false" });
    await setNotificationsEnabledAsync(false);
    expect(api.delete).toHaveBeenCalled();
  });
});

describe("notificações com o app aberto", () => {
  const notificationFor = (conversationId) => ({ request: { content: { data: { type: "message", conversationId } } } });

  it("não mostra notificação da conversa que está aberta na tela", () => {
    setActiveConversation(42);
    expect(shouldPresentNotification(notificationFor("42"))).toBe(false);
    expect(shouldPresentNotification(notificationFor("7"))).toBe(true);
  });

  it("mostra notificação de match e de mensagens com nenhuma conversa aberta", () => {
    expect(shouldPresentNotification(notificationFor("42"))).toBe(true);
    expect(shouldPresentNotification({ request: { content: { data: { type: "match" } } } })).toBe(true);
  });

  it("o handler registrado aplica essa regra", async () => {
    configureNotificationHandler();
    const { handleNotification } = Notifications.setNotificationHandler.mock.calls[0][0];

    setActiveConversation("42");
    await expect(handleNotification(notificationFor("42"))).resolves.toMatchObject({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
    });
    await expect(handleNotification(notificationFor("1"))).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
    });
  });
});

describe("notificação local", () => {
  it("dispara imediatamente (trigger null) com os dados para o deep link", async () => {
    await presentLocalNotification({ title: "Ana", body: "Oi!", data: { type: "message", conversationId: "42" } });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: "Ana", body: "Oi!", data: { type: "message", conversationId: "42" }, sound: "default" },
      trigger: null,
    });
  });

  it("não lança se o sistema recusar", async () => {
    Notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error("sem permissão"));
    await expect(presentLocalNotification({ title: "t", body: "b" })).resolves.toBe(false);
  });

  it("monta o conteúdo a partir dos eventos do socket", () => {
    expect(buildLocalNotificationFromSocket("notification", { title: "Ana", body: "Oi!", conversation_id: 42 })).toEqual({
      title: "Ana",
      body: "Oi!",
      data: { type: "message", conversationId: "42" },
    });
    expect(buildLocalNotificationFromSocket("new_match", { conversation_id: 9 })).toMatchObject({
      title: "Novo match! 💜",
      data: { type: "match", conversationId: "9" },
    });
    expect(buildLocalNotificationFromSocket("notification", {}).title).toBe("Nova mensagem");
  });
});
