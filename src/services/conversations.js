import api from "./api";

export async function fetchConversations() {
  const { data } = await api.get("/api/conversas");
  if (!Array.isArray(data)) {
    throw new Error("A resposta da lista de conversas está em um formato inválido.");
  }
  return data;
}

function toContact(conversation) {
  return {
    id: conversation.other_user_id ?? null,
    name: conversation.name || null,
    avatar: conversation.img || null,
  };
}

// Modal "It's a Match!" da Descoberta: só temos o perfil (id do outro
// usuário). A conversa é criada junto com o match no backend, então basta
// achá-la na lista. Devolve { conversationId, contact } ou null.
export async function findConversationWithUser(userId) {
  if (userId == null || userId === "") return null;
  const conversations = await fetchConversations();
  const conversation = conversations.find((c) => String(c.other_user_id) === String(userId));
  if (!conversation) return null;
  return { conversationId: conversation.id, contact: toContact(conversation) };
}

// T049 — Ao abrir o Chat por uma notificação, só temos o id da conversa.
// Busca na lista de conversas o contato (outro usuário) para o cabeçalho.
// Devolve null se a conversa não existir mais (ex.: match desfeito).
export async function findConversationContact(conversationId) {
  if (conversationId == null || conversationId === "") return null;
  const conversations = await fetchConversations();
  const conversation = conversations.find((c) => String(c.id) === String(conversationId));
  if (!conversation) return null;
  return toContact(conversation);
}
