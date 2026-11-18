// src/hooks/useChat.js
// T045 — Chat em tempo real: histórico (REST) + sala do Socket.IO.
//
// • Ao abrir: carrega o histórico e entra na sala `chat_<id>` (join_conversation).
// • Reconexão: o servidor esquece as salas quando o socket cai, então o hook
//   entra de novo a cada evento `connect`.
// • Recebimento: `new_message` adiciona a mensagem na hora, sem recarregar.
// • Envio: bolha "enviando" imediata (otimista) → `send_message` com ack.
//   Socket fora do ar? Usa o POST /api/mensagens como reserva. Se tudo falhar,
//   a bolha fica marcada como "falhou" e pode ser reenviada.
// • T046 — "digitando…": `notifyTyping()` avisa o outro lado (typing_start e,
//   após TYPING_IDLE_MS sem digitar, typing_stop); `otherTyping` indica que o
//   contato está digitando (evento user_typing).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SOCKET_EVENTS,
  emitWithAck,
  getSocket,
  isSocketConnected,
} from "../services/socket";
import { fetchMessages, sendMessageRest } from "../services/messages";
import { getFriendlyErrorMessage } from "../services/networkErrors";
import {
  MESSAGE_STATUS,
  confirmPendingMessage,
  createPendingMessage,
  markMessageDeleted,
  mergeHistory,
  mergeIncomingMessage,
  normalizeMessageList,
  setMessageStatus,
} from "../utils/chatMessages";

// Sem digitar por este tempo, avisa que parou (mesmo valor do web).
export const TYPING_IDLE_MS = 3000;
// Se o "parou de digitar" do outro lado se perder (queda de rede), o
// indicador some sozinho depois deste tempo.
export const TYPING_EXPIRE_MS = 6000;

export function useChat(conversationId, currentUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(isSocketConnected());
  const [otherTyping, setOtherTyping] = useState(false);
  const typingActive = useRef(false);
  const typingIdleTimer = useRef(null);
  const otherTypingTimer = useRef(null);
  const tempCounter = useRef(0);
  const mounted = useRef(true);
  const historyRequest = useRef(0);
  // Conversa "atual": respostas que chegam depois de trocar de conversa são
  // descartadas, para não misturar mensagens de chats diferentes.
  const currentConversation = useRef(conversationId);
  currentConversation.current = conversationId;
  const hasConversation = conversationId != null && conversationId !== "";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!hasConversation) return;
    historyRequest.current += 1;
    const requestId = historyRequest.current;
    const isStale = () => !mounted.current || requestId !== historyRequest.current;
    setLoading(true);
    setError(null);
    try {
      const { messages: raw } = await fetchMessages(conversationId);
      if (isStale()) return;
      const history = normalizeMessageList(raw, currentUserId);
      setMessages((current) => mergeHistory(current, history));
    } catch (err) {
      if (isStale()) return;
      console.error("Erro ao carregar mensagens:", err?.message || err);
      setError(getFriendlyErrorMessage(err, "Não foi possível carregar as mensagens."));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [conversationId, currentUserId, hasConversation]);

  // Troca de conversa (a aba do Chat continua montada entre conversas):
  // limpa a lista antiga e carrega a nova.
  useEffect(() => {
    setMessages([]);
    setError(null);
    setOtherTyping(false);
    loadHistory();
  }, [loadHistory]);

  // Sala do socket + eventos em tempo real.
  useEffect(() => {
    if (!hasConversation) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const join = () => socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
    const handleConnect = () => {
      setConnected(true);
      join();
    };
    const handleDisconnect = () => setConnected(false);
    const handleNewMessage = (raw) => {
      if (String(raw?.conversation_id) !== String(conversationId)) return;
      setMessages((list) => mergeIncomingMessage(list, raw, currentUserId));
    };
    const handleDeleted = (messageId) => {
      setMessages((list) => markMessageDeleted(list, messageId));
    };
    const handleUserTyping = (payload) => {
      // O servidor só repassa para os OUTROS da sala, mas o web antigo pode
      // ecoar: ignora o próprio usuário por garantia.
      if (currentUserId != null && String(payload?.user_id) === String(currentUserId)) return;
      const typing = !!payload?.is_typing;
      setOtherTyping(typing);
      clearTimeout(otherTypingTimer.current);
      if (typing) {
        otherTypingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_EXPIRE_MS);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
    socket.on(SOCKET_EVENTS.USER_TYPING, handleUserTyping);

    setConnected(socket.connected);
    if (socket.connected) join();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
      socket.off(SOCKET_EVENTS.USER_TYPING, handleUserTyping);
      clearTimeout(otherTypingTimer.current);
      clearTimeout(typingIdleTimer.current);
      if (socket.connected) {
        if (typingActive.current) {
          socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversation_id: conversationId, user_id: currentUserId });
        }
        socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
      }
      typingActive.current = false;
    };
  }, [conversationId, currentUserId, hasConversation]);

  // T046 — avisa que parei de digitar (envio, campo vazio ou inatividade).
  const stopTyping = useCallback(() => {
    clearTimeout(typingIdleTimer.current);
    if (!typingActive.current) return;
    typingActive.current = false;
    const socket = getSocket();
    if (socket?.connected && hasConversation) {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversation_id: conversationId, user_id: currentUserId });
    }
  }, [conversationId, currentUserId, hasConversation]);

  // T046 — chamado a cada alteração do texto. Só emite typing_start uma vez
  // por "rodada" de digitação (não inunda o servidor a cada tecla).
  const notifyTyping = useCallback(
    (text) => {
      if (!hasConversation) return;
      if (!String(text ?? "").trim()) {
        stopTyping();
        return;
      }
      const socket = getSocket();
      if (!socket?.connected) return;
      if (!typingActive.current) {
        typingActive.current = true;
        socket.emit(SOCKET_EVENTS.TYPING_START, { conversation_id: conversationId, user_id: currentUserId });
      }
      clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    },
    [conversationId, currentUserId, hasConversation, stopTyping]
  );

  const deliver = useCallback(
    async (tempId, text) => {
      const sentTo = conversationId;
      const stillHere = () => mounted.current && String(currentConversation.current) === String(sentTo);
      try {
        let saved;
        if (isSocketConnected()) {
          const response = await emitWithAck(SOCKET_EVENTS.SEND_MESSAGE, {
            conversation_id: conversationId,
            content: text,
          });
          if (!response?.ok) throw new Error(response?.error || "Falha ao enviar a mensagem.");
          saved = response.message;
        } else {
          saved = await sendMessageRest(conversationId, text);
        }
        if (stillHere()) {
          setMessages((list) => confirmPendingMessage(list, tempId, saved, currentUserId));
        }
        return true;
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err?.message || err);
        if (stillHere()) {
          setMessages((list) => setMessageStatus(list, tempId, MESSAGE_STATUS.FAILED));
        }
        return false;
      }
    },
    [conversationId, currentUserId]
  );

  const sendMessage = useCallback(
    (rawText) => {
      const text = String(rawText || "").trim();
      if (!text || !hasConversation) return Promise.resolve(false);
      stopTyping();
      tempCounter.current += 1;
      const tempId = `temp-${Date.now()}-${tempCounter.current}`;
      setMessages((list) => [createPendingMessage(tempId, text), ...list]);
      return deliver(tempId, text);
    },
    [deliver, hasConversation, stopTyping]
  );

  const retryMessage = useCallback(
    (message) => {
      if (!message || message.status !== MESSAGE_STATUS.FAILED) return Promise.resolve(false);
      setMessages((list) => setMessageStatus(list, message.id, MESSAGE_STATUS.PENDING));
      return deliver(message.id, message.text);
    },
    [deliver]
  );

  return {
    messages,
    loading,
    error,
    connected,
    otherTyping,
    notifyTyping,
    sendMessage,
    retryMessage,
    reload: loadHistory,
  };
}

export default useChat;
