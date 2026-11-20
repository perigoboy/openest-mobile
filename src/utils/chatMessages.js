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
  SENT: "sent",           // 1 check cinza
  DELIVERED: "delivered", // 2 checks cinzas
  READ: "read",           // 2 checks AZUIS (bloqueado pelo Modo Discreto)
  PENDING: "pending",
  FAILED: "failed",
};

// Ordem de progressão: o status nunca anda para trás.
const STATUS_RANK = { pending: -1, sent: 0, delivered: 1, read: 2 };

export function statusRank(status) {
  return STATUS_RANK[status] != null ? STATUS_RANK[status] : 0;
}

// Status vindo da API (status | delivered_at | read_at), tolerando payloads
// antigos que só tinham read_at.
export function statusFromRaw(raw) {
  if (!raw) return MESSAGE_STATUS.SENT;
  if (raw.status && STATUS_RANK[raw.status] != null && raw.status !== MESSAGE_STATUS.PENDING) {
    return raw.status;
  }
  if (raw.read_at) return MESSAGE_STATUS.READ;
  if (raw.delivered_at) return MESSAGE_STATUS.DELIVERED;
  return MESSAGE_STATUS.SENT;
}

// Aplica `message_status_updated` do socket. Só avança o status (nunca regride)
// e só mexe nas mensagens que EU enviei — são as que mostram os checks.
export function applyStatusUpdate(list, messageIds, status) {
  if (!status) return list || [];
  const ids = messageIds == null ? null : new Set((messageIds || []).map(String));
  return (list || []).map((message) => {
    if (!message.isMine) return message;
    if (ids && !ids.has(String(message.id))) return message;
    if (statusRank(status) <= statusRank(message.status)) return message;
    return { ...message, status };
  });
}

const IMAGE_URL = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|heic)(\?\S*)?$/i;
// GIF do Giphy/Tenor (nem sempre termina em .gif) também conta como imagem.
const GIF_HOST = /^https?:\/\/\S*(giphy\.com|tenor\.com|media\d*\.giphy)/i;
// Localização partilhada (mesmo texto que o web monta no handleLocation).
const MAPS_URL = /https?:\/\/(?:maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)\S*/i;
const MAPS_COORDS = /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;

export function isImageContent(text = "") {
  const value = String(text).trim();
  return IMAGE_URL.test(value) || GIF_HOST.test(value) || value.includes("res.cloudinary.com");
}

// Convite de encontro — mesma TAG do web: "[CONVITE_EVENTO]" + JSON.
export const INVITE_TAG = "[CONVITE_EVENTO]";
export const INVITE_ACCEPTED_TEXT = "✅ Convite Aceite!";
export const INVITE_REJECTED_TEXT = "❌ Convite Recusado";
// Convite aceito: a API grava "[ENCONTRO_MARCADO]{titulo, scheduled_at,
// local, nota}" e devolve `meeting` pronto. Aceites antigos (texto acima)
// também viram o card, só que sem detalhes.
export const MEETING_TAG = "[ENCONTRO_MARCADO]";
export const DELETED_MESSAGE_TEXT = "🚫 Mensagem apagada";

// Ids de bolhas ainda não confirmadas ("temp-...") não existem no servidor.
export function isServerId(id) {
  return id != null && id !== "" && !String(id).startsWith("temp-");
}

const MEETING_FIELDS = ["titulo", "scheduled_at", "local", "nota"];

export function buildMeetingContent(invite = {}) {
  const meeting = {};
  MEETING_FIELDS.forEach((key) => {
    if (invite && invite[key] != null && invite[key] !== "") meeting[key] = invite[key];
  });
  return { text: `${MEETING_TAG}${JSON.stringify(meeting)}`, meeting };
}

// Dados do encontro marcado ({} sem detalhes) ou null se não for um.
export function parseMeeting(raw) {
  if (raw && raw.meeting && typeof raw.meeting === "object") return raw.meeting;
  const text = typeof raw === "string" ? raw : raw?.content ?? raw?.text ?? "";
  const value = String(text || "");
  if (value === INVITE_ACCEPTED_TEXT) return {};
  if (!value.startsWith(MEETING_TAG)) return null;
  try {
    const data = JSON.parse(value.slice(MEETING_TAG.length));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function buildInviteMessage(payload) {
  return `${INVITE_TAG}${JSON.stringify(payload || {})}`;
}

// Devolve os dados do convite ({ titulo, scheduled_at, local, nota,
// conversation_id, other_user_id }) ou null se não for um convite pendente.
export function parseInviteMessage(text = "") {
  const value = String(text);
  if (!value.startsWith(INVITE_TAG)) return null;
  try {
    return JSON.parse(value.slice(INVITE_TAG.length));
  } catch {
    return null;
  }
}

// Status visível depois que o convite foi respondido.
export function inviteStatusFromText(text = "") {
  if (text === INVITE_ACCEPTED_TEXT || String(text).startsWith(MEETING_TAG)) return "accepted";
  if (text === INVITE_REJECTED_TEXT) return "rejected";
  return null;
}

// Detecta "📍 Localização partilhada" + link do Maps e extrai a URL/coords.
export function parseLocationMessage(text = "") {
  const value = String(text);
  if (!value.includes("📍") && !MAPS_URL.test(value)) return null;
  const urlMatch = value.match(MAPS_URL);
  if (!urlMatch) return null;
  const mapsUrl = urlMatch[0];
  const coords = mapsUrl.match(MAPS_COORDS);
  return {
    mapsUrl,
    latitude: coords ? Number(coords[1]) : null,
    longitude: coords ? Number(coords[2]) : null,
  };
}

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
  // Foto de visualização única: a API nunca manda a URL (content = null);
  // a tela mostra só o card "Foto"/"Aberta".
  const isViewOnce = raw.is_view_once === true;
  const invite = isViewOnce ? null : parseInviteMessage(text);
  const isImage = !isViewOnce && !invite && isImageContent(text);
  return {
    id: String(raw.id),
    text,
    time: formatMessageTime(createdAt),
    createdAt,
    isMine: currentUserId != null && String(raw.sender_id) === String(currentUserId),
    isImage,
    isViewOnce,
    viewOnceOpened: isViewOnce && raw.is_opened === true,
    caption: !isViewOnce && typeof raw.caption === "string" && raw.caption ? raw.caption : null,
    invite, // dados do convite de encontro (pendente) ou null
    inviteStatus: inviteStatusFromText(text), // 'accepted' | 'rejected' | null
    // Convite aceito: card "Encontro marcado" (data/local quando houver).
    meeting: isViewOnce ? null : parseMeeting(raw),
    location: isImage || invite || isViewOnce ? null : parseLocationMessage(text),
    // Citação da resposta (`reply_to` da API: id, autor, tipo e texto).
    replyTo: normalizeReply(raw, currentUserId),
    status: statusFromRaw(raw),
  };
}

// `reply_to` da API → { id, senderId, sender, isMine, type, content }.
// Mantém o formato antigo local (reply_to_content) por compatibilidade.
export function normalizeReply(raw, currentUserId) {
  const r = raw?.reply_to;
  if (r && typeof r === "object") {
    const senderId = r.sender_id != null ? String(r.sender_id) : null;
    return {
      id: r.id != null ? String(r.id) : null,
      senderId,
      sender: r.sender_name || null,
      isMine: currentUserId != null && senderId === String(currentUserId),
      type: r.type || "text",
      content: r.content || "",
    };
  }
  if (raw?.reply_to_content) {
    return { id: null, senderId: null, sender: raw.reply_to_sender || null, isMine: raw.reply_to_sender === "Você", type: "text", content: raw.reply_to_content };
  }
  return null;
}

// Tipo da mensagem da tela (mesmos tipos da API).
export function messageKind(message) {
  if (!message) return "text";
  if (message.isDeleted || message.text === DELETED_MESSAGE_TEXT) return "deleted";
  if (message.isViewOnce) return "view_once";
  if (message.invite) return "invite";
  if (message.meeting || message.inviteStatus) return "invite_answer";
  if (message.isImage) return "image";
  if (message.location) return "location";
  return "text";
}

// Citação local de uma mensagem da tela (bolha otimista e barra acima do
// campo), no mesmo formato de normalizeReply.
export function buildReplyQuote(message, { contactName = null } = {}) {
  if (!message) return null;
  if (message.type && message.isMine === undefined) return message; // já é citação
  return {
    id: message.id != null ? String(message.id) : null,
    senderId: null,
    sender: message.isMine ? "Você" : contactName,
    isMine: !!message.isMine,
    type: messageKind(message),
    content: messagePreviewLabel(message),
  };
}

const REPLY_LABELS = {
  image: "Foto",
  view_once: "Foto de visualização única",
  location: "Localização",
  invite: "Convite de encontro",
  deleted: "Mensagem apagada",
};

// Texto curto exibido na citação (o ícone vem do `type`).
export function replyQuoteText(reply) {
  if (!reply) return "";
  if (reply.type === "invite_answer") {
    return /recusad/i.test(reply.content || "") ? "Convite recusado" : "Encontro marcado";
  }
  if (reply.type === "image" && reply.content && !isImageContent(reply.content)) return reply.content;
  return REPLY_LABELS[reply.type] || String(reply.content || "");
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

export function createPendingMessage(tempId, text, { replyTo = null, now = new Date() } = {}) {
  const invite = parseInviteMessage(text);
  return {
    id: tempId,
    text,
    time: formatMessageTime(now),
    createdAt: now.toISOString(),
    isMine: true,
    isImage: !invite && isImageContent(text),
    invite,
    inviteStatus: inviteStatusFromText(text),
    meeting: parseMeeting(text),
    location: invite ? null : parseLocationMessage(text),
    replyTo,
    status: MESSAGE_STATUS.PENDING,
  };
}

// Convite respondido (aceite/recusado): troca o conteúdo pelo status e tira o
// card. Usado ao tocar em Aceitar/Recusar e ao receber `invite_updated`.
// Aceito vira o card "Encontro marcado" com os dados do convite (ou os que a
// API mandou em `payload`); recusado vira o aviso.
export function applyInviteResponse(list, messageId, responseStatus, payload = null) {
  const id = String(messageId);
  const accepted = responseStatus === "aceite" || responseStatus === "accepted";
  let changed = false;
  const next = list.map((m) => {
    if (m.id !== id) return m;
    changed = true;
    if (accepted) {
      const local = buildMeetingContent(m.invite || {});
      const meeting = payload?.meeting && typeof payload.meeting === "object" ? payload.meeting : local.meeting;
      const text = typeof payload?.content === "string" && payload.content ? payload.content : local.text;
      return { ...m, text, invite: null, inviteStatus: "accepted", meeting, location: null };
    }
    return { ...m, text: INVITE_REJECTED_TEXT, invite: null, inviteStatus: "rejected", meeting: null, location: null };
  });
  return changed ? next : list;
}

// Bolha otimista de IMAGEM: mostra a prévia local (uri do device) enquanto o
// upload ao Cloudinary não volta.
export function createPendingImageMessage(tempId, localUri, now = new Date(), { caption = null, viewOnce = false, replyTo = null } = {}) {
  return {
    id: tempId,
    // Visualização única: nem a bolha de quem enviou mostra a foto.
    text: viewOnce ? "" : localUri,
    time: formatMessageTime(now),
    createdAt: now.toISOString(),
    isMine: true,
    isImage: !viewOnce,
    isViewOnce: !!viewOnce,
    viewOnceOpened: false,
    caption: viewOnce ? null : caption || null,
    location: null,
    replyTo,
    status: MESSAGE_STATUS.PENDING,
  };
}

// `message_view_once_opened` (socket) ou abertura local: vira "Aberta" e
// não pode ser aberta de novo.
export function markViewOnceOpened(list, messageId) {
  return (list || []).map((message) =>
    String(message.id) === String(messageId) && message.isViewOnce
      ? { ...message, viewOnceOpened: true }
      : message
  );
}

// Texto curto para prévias (citação de resposta, lista de conversas).
export function messagePreviewLabel(message) {
  if (!message) return "";
  if (message.isViewOnce) return message.viewOnceOpened ? "Foto aberta" : "Foto";
  if (message.isImage) return message.caption || "Foto";
  if (message.invite) return "Convite de encontro";
  if (message.meeting) return "Encontro marcado";
  if (message.inviteStatus === "rejected") return "Convite recusado";
  if (message.location) return "Localização";
  return message.text || "";
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
  const pending = tempIndex !== -1 ? list[tempIndex] : null;
  // A citação confirmada pela API (com o nome do autor) tem prioridade; a da
  // bolha otimista fica de reserva (API antiga, sem reply_to).
  const merged = saved && pending ? { ...saved, replyTo: saved.replyTo || pending.replyTo || null } : saved;

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
  next[tempIndex] = merged;
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
