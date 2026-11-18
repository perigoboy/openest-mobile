// src/utils/chatMessages.js
// T045 — Funções PURAS que mantêm a lista de mensagens do chat consistente.
//
// A lista fica na ordem do FlatList invertido: índice 0 = mensagem mais nova.
// Cada item tem o formato usado pela tela:
//   { id, text, time, isMine, isImage, status: "sent" | "pending" | "failed", createdAt }
//
// Por que tanto cuidado com duplicadas: quando eu envio pelo socket, chegam
// DUAS confirmações da mesma mensagem — o `new_message` transmitido para a
// sala (que inclui o próprio remetente) e o ack do `send_message`. A ordem
// entre elas não é garantida. Estas funções garantem que a bolha "enviando"
// vire UMA mensagem definitiva, qualquer que seja a ordem.

export const MESSAGE_STATUS = {
  SENT: "sent",
  PENDING: "pending",
  FAILED: "failed",
};

const IMAGE_URL = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|heic)(\?\S*)?$/i;

export function formatMessageTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Converte a mensagem da API ({ id, sender_id, content, createdAt|created_at })
// para o formato da tela.
export function normalizeMessage(raw, currentUserId) {
  if (!raw || raw.id == null) return null;
  const text = typeof raw.content === "string" ? raw.content : "";
  const createdAt = raw.createdAt || raw.created_at || null;
  return {
    id: String(raw.id),
    text,
    time: formatMessageTime(createdAt),
    createdAt,
    isMine: currentUserId != null && String(raw.sender_id) === String(currentUserId),
    isImage: IMAGE_URL.test(text.trim()),
    status: MESSAGE_STATUS.SENT,
  };
}

export function normalizeMessageList(rawList, currentUserId) {
  const seen = new Set();
  const result = [];
  (rawList || []).forEach((raw) => {
    const message = normalizeMessage(raw, currentUserId);
    if (message && !seen.has(message.id)) {
      seen.add(message.id);
      result.push(message);
    }
  });
  return result;
}

export function createPendingMessage(tempId, text, now = new Date()) {
  return {
    id: tempId,
    text,
    time: formatMessageTime(now),
    createdAt: now.toISOString(),
    isMine: true,
    isImage: false,
    status: MESSAGE_STATUS.PENDING,
  };
}

// Mensagem que chegou pelo socket (`new_message`).
export function mergeIncomingMessage(list, raw, currentUserId) {
  const incoming = normalizeMessage(raw, currentUserId);
  if (!incoming) return list;
  if (list.some((m) => m.id === incoming.id)) return list;

  // Eco da MINHA mensagem: substitui a bolha "enviando" mais antiga com o
  // mesmo texto, mantendo a posição dela na lista.
  if (incoming.isMine) {
    let pendingIndex = -1;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const m = list[i];
      if (m.status === MESSAGE_STATUS.PENDING && m.text === incoming.text) {
        pendingIndex = i;
        break;
      }
    }
    if (pendingIndex !== -1) {
      const next = list.slice();
      next[pendingIndex] = incoming;
      return next;
    }
  }

  return [incoming, ...list];
}

// Confirmação do envio (ack do socket ou resposta do POST REST).
export function confirmPendingMessage(list, tempId, raw, currentUserId) {
  const saved = normalizeMessage(raw, currentUserId);
  const tempIndex = list.findIndex((m) => m.id === tempId);

  if (!saved) {
    // Servidor confirmou sem devolver a mensagem: só tira o "enviando".
    if (tempIndex === -1) return list;
    const next = list.slice();
    next[tempIndex] = { ...list[tempIndex], status: MESSAGE_STATUS.SENT };
    return next;
  }

  const alreadyThere = list.some((m) => m.id === saved.id);
  if (tempIndex === -1) {
    return alreadyThere ? list : [saved, ...list];
  }
  if (alreadyThere) {
    // O eco do socket chegou antes e já está na lista: remove a temporária.
    return list.filter((m) => m.id !== tempId);
  }
  const next = list.slice();
  next[tempIndex] = saved;
  return next;
}

export function setMessageStatus(list, id, status) {
  let changed = false;
  const next = list.map((m) => {
    if (m.id !== id) return m;
    changed = true;
    return { ...m, status };
  });
  return changed ? next : list;
}

export function markMessageDeleted(list, deletedId) {
  const id = String(deletedId);
  let changed = false;
  const next = list.map((m) => {
    if (m.id !== id) return m;
    changed = true;
    return { ...m, text: "🚫 Mensagem apagada", isImage: false };
  });
  return changed ? next : list;
}

// Junta o histórico carregado da API com o que já está na tela (mensagens
// que chegaram pelo socket ou bolhas "enviando" enquanto o histórico baixava).
export function mergeHistory(currentList, historyList) {
  const historyIds = new Set(historyList.map((m) => m.id));
  const extras = currentList.filter((m) => !historyIds.has(m.id));
  const all = [...extras, ...historyList];
  // Mantém a ordem "mais nova primeiro"; as pendentes ficam no topo.
  return all.sort((a, b) => {
    const aPending = a.status !== MESSAGE_STATUS.SENT;
    const bPending = b.status !== MESSAGE_STATUS.SENT;
    if (aPending !== bPending) return aPending ? -1 : 1;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    const na = Number(a.id);
    const nb = Number(b.id);
    return Number.isFinite(na) && Number.isFinite(nb) ? nb - na : 0;
  });
}
