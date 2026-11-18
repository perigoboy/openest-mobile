// src/services/socket.js
// T045 — Conexão Socket.IO do app (uma única instância para o app todo).
//
// Protocolo (ver openest-api/src/socket.js):
//   app → servidor: join_conversation, leave_conversation, send_message (com ack),
//                   typing_start, typing_stop
//   servidor → app: new_message, notification, new_match, message_deleted, user_typing
//
// A conexão é aberta pelo RealtimeProvider logo após o login (passando o JWT
// em `auth.token`) e fechada no logout.
import { io } from "socket.io-client";

export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_DELETED: "message_deleted",
  NOTIFICATION: "notification",
  NEW_MATCH: "new_match",
  // T046 — indicador de "digitando…" (mesmos eventos do web)
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  USER_TYPING: "user_typing",
};

export const SOCKET_ACK_TIMEOUT_MS = 8000;

let socket = null;

export function getSocketUrl() {
  return process.env.EXPO_PUBLIC_API_URL || null;
}

// Cria a instância sob demanda, SEM conectar (autoConnect: false).
// Devolve null quando a URL da API não está configurada.
export function getSocket() {
  if (socket) return socket;
  const url = getSocketUrl();
  if (!url) return null;
  socket = io(url, {
    autoConnect: false,
    // No React Native o long-polling é instável; WebSocket direto é o padrão
    // recomendado pelo socket.io-client.
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function connectSocket(token) {
  if (!token) return null;
  const instance = getSocket();
  if (!instance) {
    console.warn("[socket] EXPO_PUBLIC_API_URL não configurada — tempo real desativado.");
    return null;
  }
  // Token novo (ex.: troca de conta) exige reconectar para o servidor validar.
  const tokenChanged = instance.auth?.token !== token;
  instance.auth = { token };
  if (tokenChanged && (instance.connected || instance.active)) {
    instance.disconnect();
  }
  if (!instance.connected) instance.connect();
  return instance;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.auth = {};
  socket.disconnect();
}

export function isSocketConnected() {
  return !!socket?.connected;
}

// Assina um evento e devolve a função que cancela a assinatura.
export function onSocketEvent(event, handler) {
  const instance = getSocket();
  if (!instance) return () => {};
  instance.on(event, handler);
  return () => instance.off(event, handler);
}

// Emite e espera a confirmação (ack) do servidor, com timeout.
export function emitWithAck(event, payload, timeoutMs = SOCKET_ACK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const instance = getSocket();
    if (!instance || !instance.connected) {
      reject(new Error("SOCKET_DISCONNECTED"));
      return;
    }
    instance.timeout(timeoutMs).emit(event, payload, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

export function joinConversation(conversationId) {
  const instance = getSocket();
  if (!instance?.connected || conversationId == null) return false;
  instance.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  return true;
}

export function leaveConversation(conversationId) {
  const instance = getSocket();
  if (!instance?.connected || conversationId == null) return false;
  instance.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
  return true;
}

// Apenas para testes.
export function __resetSocketForTests() {
  socket = null;
}
