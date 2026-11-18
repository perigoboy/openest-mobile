// src/services/activeConversation.js
// T045/T048 — Qual conversa está aberta na tela agora.
// Usado para NÃO mostrar notificação de uma mensagem que o usuário já está
// vendo no Chat (seria redundante e irritante).
let activeConversationId = null;

export function setActiveConversation(conversationId) {
  activeConversationId = conversationId == null || conversationId === "" ? null : String(conversationId);
}

export function clearActiveConversation(conversationId) {
  // Só limpa se for a mesma conversa: evita que o "blur" de um chat antigo
  // apague o registro de um chat que acabou de abrir.
  if (conversationId == null || String(conversationId) === activeConversationId) {
    activeConversationId = null;
  }
}

export function getActiveConversation() {
  return activeConversationId;
}

export function isConversationActive(conversationId) {
  return conversationId != null && activeConversationId !== null && String(conversationId) === activeConversationId;
}
