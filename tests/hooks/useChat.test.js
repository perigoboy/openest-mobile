// tests/hooks/useChat.test.js
// T045 — lógica do chat em tempo real com um socket FALSO (sem rede).
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { TYPING_EXPIRE_MS, TYPING_IDLE_MS, useChat } from "../../src/hooks/useChat";
import { deleteMessageForEveryone, fetchMessages, openViewOnceMessage, sendChatImage, sendMessageRest } from "../../src/services/messages";
import { getHiddenMessageIds, hideMessageForMe as persistHiddenMessage } from "../../src/services/hiddenMessages";
import { __mockSocket as socket, emitWithAck } from "../../src/services/socket";

jest.mock("../../src/services/messages", () => ({
  fetchMessages: jest.fn(),
  sendMessageRest: jest.fn(),
  sendChatImage: jest.fn(),
  deleteMessageForEveryone: jest.fn(),
  openViewOnceMessage: jest.fn(),
}));
jest.mock("../../src/services/hiddenMessages", () => ({
  getHiddenMessageIds: jest.fn().mockResolvedValue([]),
  hideMessageForMe: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../src/services/events", () => ({
  createEvent: jest.fn().mockResolvedValue({}),
  respondInvite: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../src/services/socket", () => {
  const handlers = {};
  const fake = {
    connected: true,
    handlers,
    on: jest.fn((event, fn) => {
      (handlers[event] = handlers[event] || new Set()).add(fn);
    }),
    off: jest.fn((event, fn) => handlers[event] && handlers[event].delete(fn)),
    emit: jest.fn(),
    fire(event, ...args) {
      (handlers[event] || new Set()).forEach((fn) => fn(...args));
    },
    listenerCount(event) {
      return handlers[event] ? handlers[event].size : 0;
    },
  };
  return {
    SOCKET_EVENTS: {
      JOIN_CONVERSATION: "join_conversation",
      LEAVE_CONVERSATION: "leave_conversation",
      SEND_MESSAGE: "send_message",
      NEW_MESSAGE: "new_message",
      MESSAGE_DELETED: "message_deleted",
      INVITE_UPDATED: "invite_updated",
      TYPING_START: "typing_start",
      TYPING_STOP: "typing_stop",
      USER_TYPING: "user_typing",
      MESSAGE_STATUS_UPDATED: "message_status_updated",
      MARK_MESSAGES_READ: "mark_messages_read",
      MARK_VIEW_ONCE_OPENED: "mark_view_once_opened",
      MESSAGE_VIEW_ONCE_OPENED: "message_view_once_opened",
    },
    getSocket: () => fake,
    isSocketConnected: () => fake.connected,
    emitWithAck: jest.fn(),
    __mockSocket: fake,
  };
});

const ME = "user-me";
const OTHER = "user-ana";

const HISTORY = [
  { id: 2, conversation_id: 10, sender_id: OTHER, content: "Tudo ótimo!", createdAt: "2026-11-17T14:31:00Z" },
  { id: 1, conversation_id: 10, sender_id: ME, content: "Oi, tudo bem?", createdAt: "2026-11-17T14:30:00Z" },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderChatHook(conversationId = 10) {
  const utils = renderHook(({ id }) => useChat(id, ME), { initialProps: { id: conversationId } });
  await waitFor(() => expect(utils.result.current.loading).toBe(false));
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(socket.handlers).forEach((k) => delete socket.handlers[k]);
  socket.connected = true;
  fetchMessages.mockResolvedValue({ messages: HISTORY, hasNext: false });
});

describe("useChat — histórico e sala", () => {
  it("carrega o histórico e identifica quais mensagens são minhas", async () => {
    const { result } = await renderChatHook();

    expect(fetchMessages).toHaveBeenCalledWith(10);
    expect(result.current.messages.map((m) => [m.id, m.text, m.isMine])).toEqual([
      ["2", "Tudo ótimo!", false],
      ["1", "Oi, tudo bem?", true],
    ]);
  });

  it("entra na sala da conversa assim que abre (join_conversation)", async () => {
    await renderChatHook();
    expect(socket.emit).toHaveBeenCalledWith("join_conversation", 10);
  });

  it("entra de novo na sala quando o socket reconecta", async () => {
    await renderChatHook();
    socket.emit.mockClear();

    act(() => socket.fire("disconnect"));
    act(() => socket.fire("connect"));

    expect(socket.emit).toHaveBeenCalledWith("join_conversation", 10);
  });

  it("expõe o estado da conexão para a tela", async () => {
    const { result } = await renderChatHook();
    expect(result.current.connected).toBe(true);

    act(() => socket.fire("disconnect"));
    expect(result.current.connected).toBe(false);
  });

  it("guarda o erro amigável quando o histórico falha (sem quebrar)", async () => {
    fetchMessages.mockRejectedValue(Object.assign(new Error("Network Error"), { code: "ERR_NETWORK", request: {} }));
    const { result } = await renderChatHook();

    expect(result.current.error).toBe("Sem conexão com a internet. Verifique sua rede.");
    expect(result.current.messages).toEqual([]);
  });

  it("sai da sala e remove os listeners ao fechar a conversa", async () => {
    const { unmount } = await renderChatHook();
    expect(socket.listenerCount("new_message")).toBe(1);

    unmount();

    expect(socket.emit).toHaveBeenCalledWith("leave_conversation", 10);
    expect(socket.listenerCount("new_message")).toBe(0);
    expect(socket.listenerCount("connect")).toBe(0);
  });
});

describe("useChat — recebimento em tempo real", () => {
  it("adiciona a mensagem recebida no topo, sem recarregar", async () => {
    const { result } = await renderChatHook();

    act(() =>
      socket.fire("new_message", { id: 3, conversation_id: 10, sender_id: OTHER, content: "Bora sair?", createdAt: "2026-11-17T14:40:00Z" })
    );

    expect(result.current.messages[0]).toMatchObject({ id: "3", text: "Bora sair?", isMine: false });
    expect(fetchMessages).toHaveBeenCalledTimes(1);
  });

  it("ignora mensagens de outras conversas", async () => {
    const { result } = await renderChatHook();

    act(() => socket.fire("new_message", { id: 50, conversation_id: 999, sender_id: OTHER, content: "outra" }));

    expect(result.current.messages).toHaveLength(2);
  });

  it("não duplica a mesma mensagem recebida duas vezes", async () => {
    const { result } = await renderChatHook();
    const msg = { id: 3, conversation_id: 10, sender_id: OTHER, content: "x" };

    act(() => socket.fire("new_message", msg));
    act(() => socket.fire("new_message", msg));

    expect(result.current.messages.filter((m) => m.id === "3")).toHaveLength(1);
  });

  it("aceita o id da conversa como string (vindo do deep link)", async () => {
    const { result } = await renderChatHook("10");

    act(() => socket.fire("new_message", { id: 3, conversation_id: 10, sender_id: OTHER, content: "oi" }));

    expect(result.current.messages[0].id).toBe("3");
  });

  it("marca mensagem apagada", async () => {
    const { result } = await renderChatHook();

    act(() => socket.fire("message_deleted", "2"));

    expect(result.current.messages.find((m) => m.id === "2").text).toBe("🚫 Mensagem apagada");
  });
});

describe("useChat — envio", () => {
  it("mostra a bolha 'enviando' na hora e troca pela mensagem salva (ack)", async () => {
    const ack = deferred();
    emitWithAck.mockReturnValue(ack.promise);
    const { result } = await renderChatHook();

    let sending;
    act(() => {
      sending = result.current.sendMessage("  Olá!  ");
    });

    expect(result.current.messages[0]).toMatchObject({ text: "Olá!", status: "pending", isMine: true });
    expect(emitWithAck).toHaveBeenCalledWith("send_message", { conversation_id: 10, content: "Olá!" });

    await act(async () => {
      ack.resolve({ ok: true, message: { id: 3, conversation_id: 10, sender_id: ME, content: "Olá!" } });
      await sending;
    });

    expect(result.current.messages[0]).toMatchObject({ id: "3", status: "sent" });
    expect(result.current.messages).toHaveLength(3);
  });

  it("eco do socket ANTES do ack não gera mensagem duplicada", async () => {
    const ack = deferred();
    emitWithAck.mockReturnValue(ack.promise);
    const { result } = await renderChatHook();
    const saved = { id: 3, conversation_id: 10, sender_id: ME, content: "Olá!" };

    let sending;
    act(() => {
      sending = result.current.sendMessage("Olá!");
    });
    act(() => socket.fire("new_message", saved)); // eco da sala chega primeiro
    await act(async () => {
      ack.resolve({ ok: true, message: saved });
      await sending;
    });

    expect(result.current.messages.filter((m) => m.text === "Olá!")).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ id: "3", status: "sent" });
  });

  it("ack DEPOIS do eco também não duplica (ordem inversa)", async () => {
    const saved = { id: 3, conversation_id: 10, sender_id: ME, content: "Olá!" };
    emitWithAck.mockImplementation(async () => {
      socket.fire("new_message", saved);
      return { ok: true, message: saved };
    });
    const { result } = await renderChatHook();

    await act(async () => {
      await result.current.sendMessage("Olá!");
    });

    expect(result.current.messages.filter((m) => m.text === "Olá!")).toHaveLength(1);
  });

  it("com o socket desconectado, envia pelo REST (a mensagem não se perde)", async () => {
    socket.connected = false;
    sendMessageRest.mockResolvedValue({ id: 7, conversation_id: 10, sender_id: ME, content: "via REST" });
    const { result } = await renderChatHook();

    await act(async () => {
      await result.current.sendMessage("via REST");
    });

    expect(emitWithAck).not.toHaveBeenCalled();
    expect(sendMessageRest).toHaveBeenCalledWith(10, "via REST");
    expect(result.current.messages[0]).toMatchObject({ id: "7", status: "sent" });
  });

  it("falha no envio marca a bolha como 'falhou' e o reenvio funciona", async () => {
    emitWithAck.mockResolvedValueOnce({ ok: false, error: "Conversa não encontrada" });
    const { result } = await renderChatHook();

    let ok;
    await act(async () => {
      ok = await result.current.sendMessage("tentativa");
    });
    expect(ok).toBe(false);
    const failed = result.current.messages[0];
    expect(failed.status).toBe("failed");

    emitWithAck.mockResolvedValueOnce({ ok: true, message: { id: 8, conversation_id: 10, sender_id: ME, content: "tentativa" } });
    await act(async () => {
      ok = await result.current.retryMessage(failed);
    });

    expect(ok).toBe(true);
    expect(result.current.messages[0]).toMatchObject({ id: "8", status: "sent" });
    expect(result.current.messages.filter((m) => m.text === "tentativa")).toHaveLength(1);
  });

  it("timeout do ack também vira 'falhou' (não fica 'enviando' para sempre)", async () => {
    emitWithAck.mockRejectedValue(new Error("operation has timed out"));
    const { result } = await renderChatHook();

    await act(async () => {
      await result.current.sendMessage("lento");
    });

    expect(result.current.messages[0].status).toBe("failed");
  });

  it("ignora mensagem vazia", async () => {
    const { result } = await renderChatHook();
    let ok;
    await act(async () => {
      ok = await result.current.sendMessage("   ");
    });
    expect(ok).toBe(false);
    expect(emitWithAck).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(2);
  });
});

describe("useChat — troca de conversa (a aba do Chat continua montada)", () => {
  it("limpa as mensagens antigas e entra na nova sala", async () => {
    const { result, rerender } = await renderChatHook(10);
    fetchMessages.mockResolvedValue({
      messages: [{ id: 90, conversation_id: 20, sender_id: OTHER, content: "chat novo" }],
      hasNext: false,
    });

    rerender({ id: 20 });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(["90"]));

    expect(socket.emit).toHaveBeenCalledWith("leave_conversation", 10);
    expect(socket.emit).toHaveBeenCalledWith("join_conversation", 20);
  });

  it("descarta o histórico atrasado da conversa anterior", async () => {
    const slow = deferred();
    fetchMessages.mockReturnValueOnce(slow.promise);
    const { result, rerender } = renderHook(({ id }) => useChat(id, ME), { initialProps: { id: 10 } });

    fetchMessages.mockResolvedValueOnce({
      messages: [{ id: 90, conversation_id: 20, sender_id: OTHER, content: "chat novo" }],
      hasNext: false,
    });
    rerender({ id: 20 });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(["90"]));

    await act(async () => {
      slow.resolve({ messages: HISTORY, hasNext: false });
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["90"]);
  });

  it("confirmação atrasada de uma mensagem da conversa anterior não aparece na nova", async () => {
    const ack = deferred();
    emitWithAck.mockReturnValue(ack.promise);
    const { result, rerender } = await renderChatHook(10);

    let sending;
    act(() => {
      sending = result.current.sendMessage("para a conversa 10");
    });

    fetchMessages.mockResolvedValue({ messages: [], hasNext: false });
    rerender({ id: 20 });
    await waitFor(() => expect(result.current.messages).toEqual([]));

    await act(async () => {
      ack.resolve({ ok: true, message: { id: 5, conversation_id: 10, sender_id: ME, content: "para a conversa 10" } });
      await sending;
    });

    expect(result.current.messages).toEqual([]);
  });
});

describe("useChat — T046 indicador de digitando", () => {
  afterEach(() => jest.useRealTimers());

  it("mostra quando o OUTRO usuário está digitando e esconde quando ele para", async () => {
    const { result } = await renderChatHook();
    expect(result.current.otherTyping).toBe(false);

    act(() => socket.fire("user_typing", { user_id: OTHER, is_typing: true }));
    expect(result.current.otherTyping).toBe(true);

    act(() => socket.fire("user_typing", { user_id: OTHER, is_typing: false }));
    expect(result.current.otherTyping).toBe(false);
  });

  it("ignora o próprio usuário", async () => {
    const { result } = await renderChatHook();
    act(() => socket.fire("user_typing", { user_id: ME, is_typing: true }));
    expect(result.current.otherTyping).toBe(false);
  });

  it("o indicador expira sozinho se o 'parou' se perder na rede", async () => {
    const { result } = await renderChatHook();
    jest.useFakeTimers();

    act(() => socket.fire("user_typing", { user_id: OTHER, is_typing: true }));
    act(() => jest.advanceTimersByTime(TYPING_EXPIRE_MS + 1));

    expect(result.current.otherTyping).toBe(false);
  });

  it("avisa typing_start uma vez por rodada e typing_stop após ficar parado", async () => {
    const { result } = await renderChatHook();
    jest.useFakeTimers();
    socket.emit.mockClear();

    act(() => result.current.notifyTyping("o"));
    act(() => result.current.notifyTyping("oi"));
    act(() => result.current.notifyTyping("oi!"));

    const starts = socket.emit.mock.calls.filter(([e]) => e === "typing_start");
    expect(starts).toEqual([["typing_start", { conversation_id: 10, user_id: ME }]]);

    act(() => jest.advanceTimersByTime(TYPING_IDLE_MS + 1));
    expect(socket.emit).toHaveBeenCalledWith("typing_stop", { conversation_id: 10, user_id: ME });
  });

  it("enviar a mensagem ou apagar o texto encerra o 'digitando'", async () => {
    emitWithAck.mockResolvedValue({ ok: true, message: { id: 3, conversation_id: 10, sender_id: ME, content: "oi" } });
    const { result } = await renderChatHook();

    act(() => result.current.notifyTyping("oi"));
    socket.emit.mockClear();
    await act(async () => {
      await result.current.sendMessage("oi");
    });
    expect(socket.emit).toHaveBeenCalledWith("typing_stop", { conversation_id: 10, user_id: ME });

    act(() => result.current.notifyTyping("abc"));
    socket.emit.mockClear();
    act(() => result.current.notifyTyping(""));
    expect(socket.emit).toHaveBeenCalledWith("typing_stop", { conversation_id: 10, user_id: ME });
  });

  it("sem socket conectado não emite nada", async () => {
    socket.connected = false;
    const { result } = await renderChatHook();
    socket.emit.mockClear();

    act(() => result.current.notifyTyping("oi"));
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("ao sair da conversa enquanto digitava, avisa que parou", async () => {
    const { result, unmount } = await renderChatHook();
    act(() => result.current.notifyTyping("oi"));
    socket.emit.mockClear();

    unmount();
    expect(socket.emit).toHaveBeenCalledWith("typing_stop", { conversation_id: 10, user_id: ME });
  });
});

describe("useChat — anexos e ações da mensagem", () => {
  it("sendImage: bolha otimista com a uri local e troca pela URL salva", async () => {
    sendChatImage.mockResolvedValue({ id: 20, conversation_id: 10, sender_id: ME, content: "https://res.cloudinary.com/x/a.jpg" });
    const { result } = await renderChatHook();

    await act(async () => {
      await result.current.sendImage({ uri: "file:///a.jpg" });
    });

    expect(sendChatImage).toHaveBeenCalledWith(10, { uri: "file:///a.jpg" }, { caption: "", viewOnce: false });
    expect(result.current.messages[0]).toMatchObject({ id: "20", isImage: true, status: "sent" });
  });

  it("sendImage: falha marca a bolha como 'falhou'", async () => {
    sendChatImage.mockRejectedValue(new Error("upload falhou"));
    const { result } = await renderChatHook();
    await act(async () => {
      await result.current.sendImage({ uri: "file:///a.jpg" });
    });
    expect(result.current.messages[0].status).toBe("failed");
  });

  it("sendMessage com resposta leva a citação na bolha otimista", async () => {
    emitWithAck.mockReturnValue(new Promise(() => {})); // fica pendente
    const { result } = await renderChatHook();
    const original = result.current.messages.find((m) => m.text === "Tudo ótimo!");

    act(() => {
      result.current.sendMessage("claro!", original);
    });

    expect(result.current.messages[0]).toMatchObject({ text: "claro!", status: "pending" });
    expect(result.current.messages[0].replyTo).toMatchObject({ id: original.id, content: "Tudo ótimo!", type: "text" });
    // O id da citada vai para a API, que salva e devolve o reply_to completo.
    expect(emitWithAck).toHaveBeenCalledWith("send_message", expect.objectContaining({ reply_to_id: original.id }));
  });

  it("resposta confirmada pela API usa o reply_to do servidor (com o nome do autor)", async () => {
    const { result } = await renderChatHook();
    const original = result.current.messages.find((m) => m.text === "Tudo ótimo!");
    emitWithAck.mockResolvedValue({
      ok: true,
      message: {
        id: 77, conversation_id: 10, sender_id: ME, content: "claro!", status: "sent",
        reply_to: { id: Number(original.id), sender_id: "outro", sender_name: "Marina", type: "text", content: "Tudo ótimo!" },
      },
    });
    await act(async () => {
      await result.current.sendMessage("claro!", original);
    });
    const salva = result.current.messages.find((m) => m.id === "77");
    expect(salva.replyTo).toMatchObject({ sender: "Marina", content: "Tudo ótimo!", isMine: false });
  });

  it("deleteForEveryone marca apagada e chama a API", async () => {
    deleteMessageForEveryone.mockResolvedValue({ success: true });
    const { result } = await renderChatHook();
    const mine = result.current.messages.find((m) => m.isMine);

    await act(async () => {
      await result.current.deleteForEveryone(mine);
    });

    expect(deleteMessageForEveryone).toHaveBeenCalledWith(mine.id);
    expect(result.current.messages.find((m) => m.id === mine.id).text).toBe("🚫 Mensagem apagada");
  });

  it("hideForMe remove da lista e persiste o id escondido", async () => {
    const { result } = await renderChatHook();
    const msg = result.current.messages[0];

    await act(async () => {
      await result.current.hideForMe(msg);
    });

    expect(result.current.messages.find((m) => m.id === msg.id)).toBeUndefined();
    expect(persistHiddenMessage).toHaveBeenCalledWith(ME, msg.id);
  });

  it("mensagens escondidas não voltam ao carregar o histórico", async () => {
    getHiddenMessageIds.mockResolvedValueOnce(["1"]); // esconde a msg id 1
    const { result } = await renderChatHook();
    expect(result.current.messages.map((m) => m.id)).toEqual(["2"]);
  });

  it("mensagem escondida que chega pelo socket é ignorada", async () => {
    getHiddenMessageIds.mockResolvedValueOnce(["99"]);
    const { result } = await renderChatHook();
    act(() => socket.fire("new_message", { id: 99, conversation_id: 10, sender_id: OTHER, content: "oculta" }));
    expect(result.current.messages.some((m) => m.id === "99")).toBe(false);
  });
});

describe("useChat — convite de encontro (agendamento)", () => {
  const { createEvent, respondInvite } = require("../../src/services/events");
  const INVITE = { conversation_id: 10, other_user_id: OTHER, titulo: "Café", scheduled_at: "2026-11-18T15:07", local: "Centro", nota: "" };

  it("sendInvite envia a mensagem [CONVITE_EVENTO] como card otimista", async () => {
    emitWithAck.mockReturnValue(new Promise(() => {})); // pendente
    const { result } = await renderChatHook();
    act(() => {
      result.current.sendInvite(INVITE);
    });
    const [event, payload] = emitWithAck.mock.calls.at(-1);
    expect(event).toBe("send_message");
    expect(payload.content.startsWith("[CONVITE_EVENTO]")).toBe(true);
    expect(result.current.messages[0].invite).toMatchObject({ titulo: "Café" });
  });

  it("respondToInvite (aceitar) cria o evento, responde e troca pelo status", async () => {
    const { result } = await renderChatHook();
    act(() => socket.fire("new_message", { id: 50, conversation_id: 10, sender_id: OTHER, content: `[CONVITE_EVENTO]${JSON.stringify(INVITE)}` }));
    const invite = result.current.messages.find((m) => m.invite);
    expect(invite).toBeTruthy();

    await act(async () => {
      await result.current.respondToInvite(invite, true, "u-sender");
    });

    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ other_user_id: "u-sender", titulo: "Café" }));
    expect(respondInvite).toHaveBeenCalledWith(invite.id, "aceite");
    const aceito = result.current.messages.find((m) => m.id === invite.id);
    expect(aceito.meeting).toMatchObject({ titulo: "Café" });
    expect(aceito.inviteStatus).toBe("accepted");
  });

  it("respondToInvite (recusar) não cria evento", async () => {
    const { result } = await renderChatHook();
    act(() => socket.fire("new_message", { id: 51, conversation_id: 10, sender_id: OTHER, content: `[CONVITE_EVENTO]${JSON.stringify(INVITE)}` }));
    const invite = result.current.messages.find((m) => m.invite);
    createEvent.mockClear();
    await act(async () => {
      await result.current.respondToInvite(invite, false, "u-sender");
    });
    expect(createEvent).not.toHaveBeenCalled();
    expect(respondInvite).toHaveBeenCalledWith(invite.id, "recusado");
    expect(result.current.messages.find((m) => m.id === invite.id).text).toBe("❌ Convite Recusado");
  });

  it("evento invite_updated do socket atualiza a mensagem", async () => {
    const { result } = await renderChatHook();
    act(() => socket.fire("new_message", { id: 52, conversation_id: 10, sender_id: ME, content: `[CONVITE_EVENTO]${JSON.stringify(INVITE)}` }));
    act(() => socket.fire("invite_updated", { messageId: "52", status: "aceite" }));
    expect(result.current.messages.find((m) => m.id === "52").meeting).toMatchObject({ titulo: "Café" });
  });
});


// --- Legenda e foto de visualização única ---------------------------------
describe("useChat — foto de visualização única", () => {
  const VO = { id: 30, conversation_id: 10, sender_id: OTHER, content: null, is_view_once: true, is_opened: false, createdAt: "2026-11-19T20:00:00Z" };

  it("sendImage com visualização única: a bolha de quem envia NÃO mostra a foto", async () => {
    sendChatImage.mockReturnValue(new Promise(() => {})); // fica pendente
    const { result } = await renderChatHook();

    act(() => {
      result.current.sendImage({ uri: "file:///segredo.jpg" }, { viewOnce: true });
    });

    const bolha = result.current.messages[0];
    expect(bolha).toMatchObject({ isViewOnce: true, isImage: false, text: "", status: "pending" });
    expect(sendChatImage).toHaveBeenCalledWith(10, { uri: "file:///segredo.jpg" }, { caption: "", viewOnce: true });
  });

  it("sendImage com legenda leva a legenda para a bolha e para a API", async () => {
    sendChatImage.mockReturnValue(new Promise(() => {}));
    const { result } = await renderChatHook();
    act(() => {
      result.current.sendImage({ uri: "file:///a.jpg" }, { caption: "praia" });
    });
    expect(result.current.messages[0]).toMatchObject({ isImage: true, caption: "praia" });
    expect(sendChatImage).toHaveBeenCalledWith(10, { uri: "file:///a.jpg" }, { caption: "praia", viewOnce: false });
  });

  it("histórico: foto única chega sem URL e vira o card (não imagem)", async () => {
    fetchMessages.mockResolvedValueOnce({ messages: [VO, ...HISTORY], hasNext: false });
    const { result } = await renderChatHook();
    const msg = result.current.messages.find((m) => m.id === "30");
    expect(msg).toMatchObject({ isViewOnce: true, viewOnceOpened: false, isImage: false });
  });

  it("abrir pelo socket devolve a URL UMA vez e marca como aberta", async () => {
    fetchMessages.mockResolvedValueOnce({ messages: [VO, ...HISTORY], hasNext: false });
    emitWithAck.mockResolvedValueOnce({ ok: true, url: "https://x/unica.jpg", caption: null });
    const { result } = await renderChatHook();
    const msg = result.current.messages.find((m) => m.id === "30");

    let aberta;
    await act(async () => {
      aberta = await result.current.openViewOnce(msg);
    });

    expect(emitWithAck).toHaveBeenCalledWith("mark_view_once_opened", { message_id: "30" });
    expect(aberta).toEqual({ url: "https://x/unica.jpg", caption: null });
    expect(result.current.messages.find((m) => m.id === "30").viewOnceOpened).toBe(true);
  });

  it("segunda abertura recusada (410) marca como aberta e lança o motivo", async () => {
    fetchMessages.mockResolvedValueOnce({ messages: [VO, ...HISTORY], hasNext: false });
    emitWithAck.mockResolvedValueOnce({ ok: false, code: "already_opened", error: "Esta foto já foi aberta." });
    const { result } = await renderChatHook();
    const msg = result.current.messages.find((m) => m.id === "30");

    await act(async () => {
      await expect(result.current.openViewOnce(msg)).rejects.toMatchObject({ code: "already_opened" });
    });
    expect(result.current.messages.find((m) => m.id === "30").viewOnceOpened).toBe(true);
  });

  it("sem socket, abre pela rota REST (reserva)", async () => {
    fetchMessages.mockResolvedValueOnce({ messages: [VO, ...HISTORY], hasNext: false });
    openViewOnceMessage.mockResolvedValueOnce({ url: "https://x/rest.jpg", caption: "oi" });
    const { result } = await renderChatHook();
    const msg = result.current.messages.find((m) => m.id === "30");

    socket.connected = false;
    try {
      await act(async () => {
        await expect(result.current.openViewOnce(msg)).resolves.toEqual({ url: "https://x/rest.jpg", caption: "oi" });
      });
    } finally {
      socket.connected = true;
    }
    expect(openViewOnceMessage).toHaveBeenCalledWith("30");
  });

  it("quem enviou não abre a própria foto (nem chama a API)", async () => {
    const { result } = await renderChatHook();
    await act(async () => {
      await expect(
        result.current.openViewOnce({ id: "31", isViewOnce: true, isMine: true, viewOnceOpened: false })
      ).rejects.toMatchObject({ code: "sender" });
    });
    expect(emitWithAck).not.toHaveBeenCalledWith("mark_view_once_opened", expect.anything());
  });

  it("evento em tempo real: quando o outro abre, a minha vira 'Aberta'", async () => {
    const MINHA = { ...VO, id: 32, sender_id: ME };
    fetchMessages.mockResolvedValueOnce({ messages: [MINHA, ...HISTORY], hasNext: false });
    const { result } = await renderChatHook();

    act(() => {
      socket.fire("message_view_once_opened", { message_id: 32, conversation_id: 10 });
    });
    expect(result.current.messages.find((m) => m.id === "32").viewOnceOpened).toBe(true);
  });

  it("evento de OUTRA conversa é ignorado", async () => {
    const MINHA = { ...VO, id: 33, sender_id: ME };
    fetchMessages.mockResolvedValueOnce({ messages: [MINHA, ...HISTORY], hasNext: false });
    const { result } = await renderChatHook();
    act(() => {
      socket.fire("message_view_once_opened", { message_id: 33, conversation_id: 999 });
    });
    expect(result.current.messages.find((m) => m.id === "33").viewOnceOpened).toBe(false);
  });
});
