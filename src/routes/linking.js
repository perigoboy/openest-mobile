// src/routes/linking.js
// T049 — Deep Linking a partir das notificações.
//
// • Esquema configurado em app.json: "scheme": "openest".
//     openest://chat/42      → tela de Chat da conversa 42
//     openest://conversas    → lista de conversas (Matches)
// • Tocar numa notificação (push do backend ou local) abre o app já na
//   conversa certa: o `data` da notificação ({ type, conversationId }) vira
//   uma URL e o React Navigation navega sozinho.
// • Funciona nos 3 estados do app: aberto, em segundo plano e fechado
//   (cold start via getLastNotificationResponse).
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";

export const DEEP_LINK_SCHEME = "openest";

export const LINKING_SCREENS = {
  // Área logada (AppRoutes)
  Discovery: "descobrir",
  Matches: "conversas",
  Chat: "chat/:conversationId",
  Encontros: "encontros",
  Profile: "perfil",
  Settings: "configuracoes",
  // Área pública (AuthRoutes)
  Login: "login",
  Register: "cadastro",
  ForgotPassword: "recuperar-senha",
};

// Monta a URL de destino a partir do `data` da notificação.
// Linking.createURL gera o prefixo certo para cada ambiente
// (openest:// no build, exp://.../--/ no Expo Go).
export function getUrlFromNotificationData(data) {
  if (!data || typeof data !== "object") return null;
  const conversationId = data.conversationId ?? data.conversation_id;
  if (conversationId != null && conversationId !== "") {
    return Linking.createURL(`chat/${encodeURIComponent(String(conversationId))}`);
  }
  if (data.type === "match" || data.type === "message") {
    return Linking.createURL("conversas");
  }
  return null;
}

export function getUrlFromNotificationResponse(response) {
  return getUrlFromNotificationData(response?.notification?.request?.content?.data);
}

function clearLastResponse() {
  try {
    Notifications.clearLastNotificationResponse?.();
  } catch {
    // sem efeito colateral relevante — só evita reabrir o mesmo chat
  }
}

export const linking = {
  prefixes: [Linking.createURL("/"), `${DEEP_LINK_SCHEME}://`],
  config: {
    screens: LINKING_SCREENS,
  },

  // App aberto do zero (cold start): a notificação tocada tem prioridade
  // sobre a URL inicial (no Expo Go a URL inicial é sempre a do servidor dev).
  async getInitialURL() {
    try {
      const response = Notifications.getLastNotificationResponse?.();
      const fromNotification = getUrlFromNotificationResponse(response);
      if (fromNotification) {
        // A última resposta fica guardada até ser limpa — sem isso o app
        // reabriria nesse chat em todo cold start seguinte.
        clearLastResponse();
        return fromNotification;
      }
    } catch (error) {
      console.error("Erro ao ler a notificação que abriu o app:", error?.message || error);
    }
    return Linking.getInitialURL();
  },

  // App aberto ou em segundo plano.
  subscribe(listener) {
    const urlSubscription = Linking.addEventListener("url", ({ url }) => listener(url));
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = getUrlFromNotificationResponse(response);
      if (url) {
        clearLastResponse();
        listener(url);
      }
    });

    return () => {
      urlSubscription?.remove?.();
      notificationSubscription?.remove?.();
    };
  },
};

export default linking;
