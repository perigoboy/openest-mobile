// src/contexts/RealtimeContext.js
// T045 — abre a conexão Socket.IO (com o JWT) quando o usuário loga e fecha
//        no logout.
// T048 — registra o Expo Push Token e, enquanto o app está aberto, transforma
//        os eventos `notification` / `new_match` do socket em notificações
//        locais quando o push remoto não está disponível.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./AuthContext";
import {
  SOCKET_EVENTS,
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../services/socket";
import {
  areNotificationsEnabled,
  buildInAppNotificationFromSocket,
  registerForPushNotificationsAsync,
} from "../services/notifications";
import { showInAppNotification } from "../services/inAppNotifications";
import { isConversationActive } from "../services/activeConversation";

const RealtimeContext = createContext({ connected: false });

// Token do login de desenvolvimento (admin/123 no AuthContext): não existe no
// backend, então não adianta abrir socket nem registrar push com ele.
export function isMockToken(token) {
  return typeof token === "string" && token.startsWith("mock-");
}

// Front-1 — Mostra o banner in-app ao receber um evento de socket (mensagem/
// match). Só com o push remoto DESATIVADO (Expo Go/sem token): com push ativo,
// o próprio SO mostra o aviso e não queremos duplicar. Nunca para a conversa
// que já está aberta, nem com as notificações desligadas nas Configurações.
export async function handleRealtimeEvent(event, payload, { pushRegistered }) {
  if (pushRegistered) return false;
  const conversationId = payload?.conversation_id ?? payload?.conversationId;
  if (isConversationActive(conversationId)) return false;
  if (!(await areNotificationsEnabled())) return false;
  return showInAppNotification(buildInAppNotificationFromSocket(event, payload));
}

export function RealtimeProvider({ children }) {
  const { signed, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const pushRegistered = useRef(false);

  // Conecta/desconecta conforme o login.
  useEffect(() => {
    if (!signed) {
      pushRegistered.current = false;
      disconnectSocket();
      setConnected(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("user_token");
        if (cancelled || !token || isMockToken(token)) return;
        connectSocket(token);
        const pushToken = await registerForPushNotificationsAsync();
        if (!cancelled) pushRegistered.current = !!pushToken;
      } catch (error) {
        console.error("Erro ao iniciar o tempo real:", error?.message || error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signed, user?.id]);

  // Eventos globais (valem em qualquer tela do app).
  useEffect(() => {
    if (!signed) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (error) => {
      setConnected(false);
      console.warn("[socket] Falha na conexão em tempo real:", error?.message || error);
    };
    const onNotification = (payload) =>
      handleRealtimeEvent(SOCKET_EVENTS.NOTIFICATION, payload, { pushRegistered: pushRegistered.current });
    const onNewMatch = (payload) =>
      handleRealtimeEvent(SOCKET_EVENTS.NEW_MATCH, payload, { pushRegistered: pushRegistered.current });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on(SOCKET_EVENTS.NOTIFICATION, onNotification);
    socket.on(SOCKET_EVENTS.NEW_MATCH, onNewMatch);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off(SOCKET_EVENTS.NOTIFICATION, onNotification);
      socket.off(SOCKET_EVENTS.NEW_MATCH, onNewMatch);
    };
  }, [signed]);

  return <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
