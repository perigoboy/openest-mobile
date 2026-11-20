// src/services/messages.js
// T045 — Mensagens do chat via REST (histórico + envio de reserva).
// O envio "normal" é pelo socket (src/hooks/useChat.js); a rota REST é usada
// quando o socket está desconectado, para a mensagem nunca se perder.
import api from "./api";
import { multipartUploadConfig } from "./uploadConfig";

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

// Anexo de FOTO — mesmo endpoint do web (POST /api/mensagens/imagem, multer +
// Cloudinary, campo "image"). O backend salva, emite new_message na sala e
// devolve a mensagem salva (content = URL do Cloudinary).
export async function sendChatImage(conversationId, asset, { caption = "", viewOnce = false } = {}) {
  const uri = asset?.uri;
  if (conversationId == null || !uri) {
    throw new Error("Imagem inválida para envio.");
  }
  const formData = new FormData();
  formData.append("conversation_id", String(conversationId));
  // Legenda opcional e foto de visualização única (abre UMA vez).
  if (caption && caption.trim()) formData.append("caption", caption.trim());
  if (viewOnce) formData.append("is_view_once", "true");
  formData.append("image", {
    uri,
    name: asset.fileName || `chat-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
  });
  const { data } = await api.post("/api/mensagens/imagem", formData, multipartUploadConfig());
  return data;
}

// Apagar p/ TODOS — mesma rota do web (DELETE /api/mensagens/:id). O backend
// troca o conteúdo por "🚫 Mensagem apagada" e emite message_deleted na sala.
export async function deleteMessageForEveryone(messageId) {
  if (messageId == null) throw new Error("Mensagem inválida.");
  const { data } = await api.delete(`/api/mensagens/${encodeURIComponent(messageId)}`);
  return data;
}


// Abre uma foto de visualização única (fallback REST quando o socket está
// fora). Devolve { url, caption } UMA vez; depois disso a API responde 410.
export async function openViewOnceMessage(messageId) {
  if (messageId == null) throw new Error("Mensagem inválida.");
  const { data } = await api.patch(`/api/mensagens/${encodeURIComponent(messageId)}/open-view-once`);
  return data;
}
