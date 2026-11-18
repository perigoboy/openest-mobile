// tests/services/notifications.expoGo.test.js
// Front-2 — No Expo Go, o módulo nativo de notificações crasha. As chamadas
// nativas devem ser PULADAS (o banner in-app assume). Aqui Constants simula o
// Expo Go (appOwnership: 'expo').
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { appOwnership: "expo", executionEnvironment: "storeClient" },
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 6 },
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[x]" }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("id"),
}));
jest.mock("../../src/services/api", () => ({ __esModule: true, default: { post: jest.fn(), delete: jest.fn() } }));

import {
  ensureAndroidChannelAsync,
  isExpoGo,
  presentLocalNotification,
  registerForPushNotificationsAsync,
} from "../../src/services/notifications";

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "android";
});

describe("bypass do Expo Go (Front-2)", () => {
  it("isExpoGo() detecta o Expo Go", () => {
    expect(isExpoGo()).toBe(true);
  });

  it("não cria o canal Android nativo (evita o NullPointerException)", async () => {
    await ensureAndroidChannelAsync();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("não registra push remoto (nem busca token)", async () => {
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("não dispara notificação local nativa", async () => {
    await expect(presentLocalNotification({ title: "x", body: "y" })).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
