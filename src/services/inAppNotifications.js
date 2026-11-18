// src/services/inAppNotifications.js
// Front-1 — Fila (pub/sub) do banner de notificação in-app estilo Instagram.
// O RealtimeContext publica aqui ao receber um evento de socket; o
// <InAppNotificationBanner /> (montado uma vez no App) escuta e exibe.
//
// Começa SEMPRE vazio: nada aparece sem um evento real (mensagem/match).
let listeners = new Set();
let seq = 0;

export function subscribeInApp(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Há um banner montado para exibir? (em testes/antes do App montar, não.)
export function hasInAppHandler() {
  return listeners.size > 0;
}

// Publica uma notificação. Formato:
//   { type:'message'|'match', name, message, avatar, conversationId, userId }
// Só o banner mais recente fica visível (estilo Instagram: um por vez).
export function showInAppNotification(notification) {
  if (!notification) return null;
  seq += 1;
  const withId = { id: `inapp-${seq}-${Date.now()}`, ...notification };
  listeners.forEach((listener) => {
    try {
      listener(withId);
    } catch (error) {
      console.error("Erro no listener de notificação in-app:", error);
    }
  });
  return withId.id;
}

// Apenas para testes.
export function __resetInAppForTests() {
  listeners = new Set();
  seq = 0;
}
