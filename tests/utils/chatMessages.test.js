// tests/utils/chatMessages.test.js
// T045 — funções puras que mantêm a lista do chat sem duplicadas.
import {
  MESSAGE_STATUS,
  confirmPendingMessage,
  createPendingMessage,
  formatMessageTime,
  markMessageDeleted,
  mergeHistory,
  mergeIncomingMessage,
  normalizeMessage,
  normalizeMessageList,
  setMessageStatus,
} from "../../src/utils/chatMessages";

const ME = "me";

describe("normalizeMessage", () => {
  it("converte o formato da API para o da tela", () => {
    const msg = normalizeMessage({ id: 5, sender_id: ME, content: "Oi", createdAt: "2026-11-17T10:05:00" }, ME);
    expect(msg).toMatchObject({ id: "5", text: "Oi", time: "10:05", isMine: true, isImage: false, status: "sent" });
  });

  it("aceita created_at (snake_case) e compara ids de tipos diferentes", () => {
    const msg = normalizeMessage({ id: 6, sender_id: 42, content: "x", created_at: "2026-11-17T08:09:00" }, "42");
    expect(msg.isMine).toBe(true);
    expect(msg.time).toBe("08:09");
  });

  it("detecta imagem pela URL", () => {
    expect(normalizeMessage({ id: 1, content: "https://cdn.x/a.JPG?w=2" }, ME).isImage).toBe(true);
    expect(normalizeMessage({ id: 2, content: "olha https://cdn.x/a.jpg" }, ME).isImage).toBe(false);
  });

  it("devolve null para entrada inválida e trata conteúdo ausente", () => {
    expect(normalizeMessage(null, ME)).toBeNull();
    expect(normalizeMessage({ content: "sem id" }, ME)).toBeNull();
    expect(normalizeMessage({ id: 1 }, ME).text).toBe("");
  });

  it("sem usuário logado nenhuma mensagem é 'minha'", () => {
    expect(normalizeMessage({ id: 1, sender_id: undefined, content: "x" }, undefined).isMine).toBe(false);
  });
});

describe("formatMessageTime", () => {
  it("formata HH:MM e tolera datas inválidas", () => {
    expect(formatMessageTime("2026-11-17T07:03:00")).toBe("07:03");
    expect(formatMessageTime("lixo")).toBe("");
    expect(formatMessageTime(null)).toBe("");
  });
});

describe("normalizeMessageList", () => {
  it("remove duplicadas e inválidas", () => {
    const list = normalizeMessageList([{ id: 1, content: "a" }, { id: 1, content: "a" }, null, { id: 2, content: "b" }], ME);
    expect(list.map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("mergeIncomingMessage", () => {
  const base = [normalizeMessage({ id: 1, sender_id: "ana", content: "oi" }, ME)];

  it("adiciona mensagem nova no topo", () => {
    const next = mergeIncomingMessage(base, { id: 2, sender_id: "ana", content: "tudo?" }, ME);
    expect(next.map((m) => m.id)).toEqual(["2", "1"]);
  });

  it("ignora id repetido (mantém a mesma referência)", () => {
    expect(mergeIncomingMessage(base, { id: 1, sender_id: "ana", content: "oi" }, ME)).toBe(base);
  });

  it("eco da minha mensagem substitui a bolha 'enviando' mais antiga com o mesmo texto", () => {
    const list = [createPendingMessage("t2", "oi"), createPendingMessage("t1", "oi"), ...base];
    const next = mergeIncomingMessage(list, { id: 9, sender_id: ME, content: "oi" }, ME);
    expect(next.map((m) => m.id)).toEqual(["t2", "9", "1"]);
  });

  it("mensagem minha sem bolha pendente (ex.: enviada de outro aparelho) entra normalmente", () => {
    const next = mergeIncomingMessage(base, { id: 9, sender_id: ME, content: "do web" }, ME);
    expect(next[0]).toMatchObject({ id: "9", isMine: true });
  });
});

describe("confirmPendingMessage", () => {
  it("troca a temporária pela salva", () => {
    const list = [createPendingMessage("t1", "oi")];
    const next = confirmPendingMessage(list, "t1", { id: 3, sender_id: ME, content: "oi" }, ME);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "3", status: "sent" });
  });

  it("se o eco já trouxe a salva, só remove a temporária", () => {
    const saved = normalizeMessage({ id: 3, sender_id: ME, content: "oi" }, ME);
    const list = [createPendingMessage("t1", "oi"), saved];
    expect(confirmPendingMessage(list, "t1", { id: 3, sender_id: ME, content: "oi" }, ME).map((m) => m.id)).toEqual(["3"]);
  });

  it("sem a temporária e sem a salva, adiciona a salva", () => {
    expect(confirmPendingMessage([], "t1", { id: 3, sender_id: ME, content: "oi" }, ME).map((m) => m.id)).toEqual(["3"]);
  });

  it("confirmação sem corpo só marca como enviada", () => {
    const next = confirmPendingMessage([createPendingMessage("t1", "oi")], "t1", undefined, ME);
    expect(next[0]).toMatchObject({ id: "t1", status: "sent" });
  });
});

describe("status e exclusão", () => {
  it("setMessageStatus altera só a mensagem certa", () => {
    const list = [createPendingMessage("t1", "a"), createPendingMessage("t2", "b")];
    const next = setMessageStatus(list, "t2", MESSAGE_STATUS.FAILED);
    expect(next.map((m) => m.status)).toEqual(["pending", "failed"]);
    expect(setMessageStatus(list, "nao-existe", MESSAGE_STATUS.FAILED)).toBe(list);
  });

  it("markMessageDeleted aceita id numérico", () => {
    const list = [normalizeMessage({ id: 4, content: "https://x/a.png" }, ME)];
    const next = markMessageDeleted(list, 4);
    expect(next[0]).toMatchObject({ text: "🚫 Mensagem apagada", isImage: false });
  });
});

describe("mergeHistory", () => {
  it("mantém o que chegou pelo socket durante o carregamento e ordena do mais novo ao mais antigo", () => {
    const live = normalizeMessage({ id: 30, content: "ao vivo", createdAt: "2026-11-17T12:00:00Z" }, ME);
    const pending = createPendingMessage("t1", "enviando", new Date("2026-11-17T11:00:00Z"));
    const history = normalizeMessageList(
      [
        { id: 20, content: "b", createdAt: "2026-11-17T10:00:00Z" },
        { id: 10, content: "a", createdAt: "2026-11-17T09:00:00Z" },
      ],
      ME
    );

    const merged = mergeHistory([live, pending], history);
    expect(merged.map((m) => m.id)).toEqual(["t1", "30", "20", "10"]);
  });

  it("não duplica mensagens que estão nos dois lados", () => {
    const history = normalizeMessageList([{ id: 1, content: "a" }], ME);
    expect(mergeHistory(history, history)).toHaveLength(1);
  });
});
