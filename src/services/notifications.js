// src/services/notifications.js
// T048 — Push Notifications (novo match e nova mensagem).
//
// Fluxo:
//   1. Após o login, `registerForPushNotificationsAsync()` pede permissão,
//      obtém o Expo Push Token e o registra na API (POST /api/users/push-token).
//      A partir daí o BACKEND manda push a cada mensagem/match — é isso que faz
//      o aviso chegar com o app em segundo plano ou fechado.
//   2. Com o app aberto, o RealtimeProvider também recebe os eventos do socket
//      e, se o push remoto não estiver disponível (Expo Go, emulador, permissão
//      negada), mostra uma notificação LOCAL com `presentLocalNotification()`.
//   3. A notificação nunca aparece para a conversa que já está aberta na tela.
//
// ⚠️ Push remoto exige um development build (não funciona no Expo Go para
// Android desde o SDK 53) e um `projectId` do EAS em app.json
// (expo.extra.eas.projectId — gerado com `eas init`).
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import api from "./api";
import { isConversationActive } from "./activeConversation";

export const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled"; // mesma chave da tela de Configurações
export const PUSH_TOKEN_KEY = "expo_push_token";
export const ANDROID_CHANNEL_ID = "default"; // o backend envia com channelId: "default"

// Front-2 — No Expo Go (Android, SDK 53+) o módulo nativo de notificações é
// limitado: `setNotificationChannelAsync` estoura NullPointerException e o push
// remoto não existe. Detectamos o Expo Go para PULAR as chamadas nativas; o
// banner in-app (estilo Instagram) assume o aviso enquanto se está no Expo Go.
export function isExpoGo() {
  return (
    Constants?.appOwnership === "expo" ||
    Constants?.executionEnvironment === "storeClient"
  );
}

// Preferência da tela de Configurações (padrão: ativadas).
export async function areNotificationsEnabled() {
  try {
    const stored = await SecureStore.getItemAsync(NOTIFICATIONS_ENABLED_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

function getNotificationData(notification) {
  return notification?.request?.content?.data || {};
}

// Decide se uma notificação recebida com o app ABERTO deve aparecer.
export function shouldPresentNotification(notification) {
  const data = getNotificationData(notification);
  const conversationId = data.conversationId ?? data.conversation_id;
  return !isConversationActive(conversationId);
}

// Chamado uma vez no App.js.
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = shouldPresentNotification(notification);
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

export async function ensureAndroidChannelAsync() {
  if (Platform.OS !== "android") return;
  // Front-2 — no Expo Go isto crasha (NullPointerException). Pula sem erro.
  if (isExpoGo()) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Matches e mensagens",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8E44AD",
    });
  } catch (error) {
    console.warn("[push] Não foi possível criar o canal Android:", error?.message || error);
  }
}

export function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
}

async function ensurePermissionAsync() {
  const current = await Notifications.getPermissionsAsync();
  if (current?.status === "granted") return true;
  if (current?.canAskAgain === false) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested?.status === "granted";
}

// Pede permissão, obtém o Expo Push Token e registra na API.
// Devolve o token ou null (sem permissão, emulador, sem projectId, offline...).
// Nunca lança: push é um "extra", não pode quebrar o login.
export async function registerForPushNotificationsAsync() {
  try {
    if (!(await areNotificationsEnabled())) return null;

    // Front-2 — Expo Go não tem push remoto nem canal nativo. Sai cedo, sem
    // tocar no módulo nativo (que crasharia); o banner in-app cobre o aviso.
    if (isExpoGo()) return null;

    await ensureAndroidChannelAsync();
    const granted = await ensurePermissionAsync();
    if (!granted) return null;

    // Emuladores/simuladores não recebem push remoto (as notificações locais
    // continuam funcionando via socket).
    if (!Device.isDevice) return null;

    const projectId = getProjectId();
    if (!projectId) {
      console.warn("[push] Sem expo.extra.eas.projectId no app.json — rode `eas init` para ativar o push remoto.");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    await api.post(
      "/api/users/push-token",
      { token, platform: Platform.OS },
      { skipGlobalErrorHandler: true }
    );
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.error("Erro ao registrar push notifications:", error?.message || error);
    return null;
  }
}

// Logout ou notificações desativadas: o aparelho para de receber push desta conta.
export async function unregisterPushNotificationsAsync() {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return false;
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await api.delete("/api/users/push-token", {
      data: { token },
      skipGlobalErrorHandler: true,
    });
    return true;
  } catch (error) {
    console.error("Erro ao remover push token:", error?.message || error);
    return false;
  }
}

// Usado pela tela de Configurações ao ligar/desligar o Switch.
export async function setNotificationsEnabledAsync(enabled) {
  if (enabled) return registerForPushNotificationsAsync();
  await unregisterPushNotificationsAsync();
  return null;
}

// Notificação local imediata (trigger: null). `data` segue o mesmo formato do
// push do backend ({ type, conversationId }) para o Deep Linking (T049).
export async function presentLocalNotification({ title, body, data }) {
  // Front-2 — no Expo Go a notificação nativa crasha; o banner in-app cobre.
  if (isExpoGo()) return false;
  try {
    await ensureAndroidChannelAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: "default" },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.error("Erro ao exibir notificação local:", error?.message || error);
    return false;
  }
}

// Front-1 — converte um evento de socket no formato do BANNER in-app
// (foto do Cloudinary, nome do remetente, prévia da mensagem).
export function buildInAppNotificationFromSocket(event, payload = {}) {
  const conversationId = payload.conversation_id ?? payload.conversationId ?? null;
  if (event === "new_match") {
    return {
      type: "match",
      name: payload.other_user_name || "Novo match",
      message: "Vocês deram match! Diga oi 💜",
      avatar: payload.other_user_avatar || null,
      conversationId,
      userId: payload.user_id ?? null,
    };
  }
  return {
    type: "message",
    name: payload.sender_name || payload.title || "Nova mensagem",
    message: payload.content || payload.body || "Você recebeu uma nova mensagem",
    avatar: payload.sender_avatar || null,
    conversationId,
    userId: payload.sender_id ?? null,
  };
}

// Converte os eventos do socket em notificações locais.
export function buildLocalNotificationFromSocket(event, payload = {}) {
  const conversationId = payload.conversation_id ?? payload.conversationId ?? null;
  const data = { type: event === "new_match" ? "match" : "message" };
  if (conversationId != null) data.conversationId = String(conversationId);

  if (event === "new_match") {
    return { title: "Novo match! 💜", body: "Você tem um novo match. Diga oi!", data };
  }
  return {
    title: payload.title || "Nova mensagem",
    body: payload.body || "Você recebeu uma nova mensagem",
    data,
  };
}
