// src/services/hiddenMessages.js
// "Apagar p/ mim" — esconde a mensagem só para o usuário logado, sem tocar na
// API (mesmo comportamento do web, que usa localStorage `openest_hidden_msgs_<id>`).
// Aqui persistimos por usuário no SecureStore; some da lista na hora e continua
// escondida nas próximas aberturas do chat.
import * as SecureStore from "expo-secure-store";

const PREFIX = "openest_hidden_msgs_";

function keyFor(userId) {
  return `${PREFIX}${userId ?? "anon"}`;
}

export async function getHiddenMessageIds(userId) {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function hideMessageForMe(userId, messageId) {
  if (messageId == null) return getHiddenMessageIds(userId);
  const current = await getHiddenMessageIds(userId);
  const id = String(messageId);
  if (current.includes(id)) return current;
  const next = [...current, id];
  try {
    await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(next));
  } catch (error) {
    console.error("Erro ao salvar mensagens ocultas:", error?.message || error);
  }
  return next;
}
