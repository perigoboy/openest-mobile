// src/services/messages.js
// T045 — Mensagens do chat via REST (histórico + envio de reserva).
// O envio "normal" é pelo socket (src/hooks/useChat.js); a rota REST é usada
// quando o socket está desconectado, para a mensagem nunca se perder.
import api from "./api";

export const MESSAGES_PAGE_SIZE = 30;

// GET /api/:id/mensagens → { messages: [...mais nova primeiro], pagination }
export async function fetchMessages(conversationId, { page = 1, limit = MESSAGES_PAGE_SIZE } = {}) {
  if (conversationId == null || conversationId === "") {
    throw new Error("Conversa inválida.");
  }
  const { data } = await api.get(`/api/${encodeURIComponent(conversationId)}/mensagens`, {
    params: { page, limit },
  });
  if (!Array.isArray(data?.messages)) {
    throw new Error("A resposta do histórico de mensagens está em um formato inválido.");
  }
  return {
    messages: data.messages,
    hasNext: Boolean(data?.pagination?.hasNext),
  };
}

// POST /api/mensagens { conversation_id, content } → mensagem salva
export async function sendMessageRest(conversationId, content) {
  const { data } = await api.post("/api/mensagens", {
    conversation_id: conversationId,
    content,
  });
  return data;
}
