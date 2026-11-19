// tests/utils/chatMessages.test.js
// T045 — funções puras que mantêm a lista do chat sem duplicadas.
import {
  MESSAGE_STATUS,
  applyStatusUpdate,
  statusFromRaw,
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
    const pending = createPendingMessage("t1", "enviando", { now: new Date("2026-11-17T11:00:00Z") });
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

import {
  isImageContent,
  parseLocationMessage,
  createPendingImageMessage,
} from "../../src/utils/chatMessages";

describe("isImageContent", () => {
  it("detecta Cloudinary, extensões de imagem e GIFs do Giphy/Tenor", () => {
    expect(isImageContent("https://res.cloudinary.com/x/a")).toBe(true);
    expect(isImageContent("https://cdn.x/a.jpg")).toBe(true);
    expect(isImageContent("https://media.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(isImageContent("https://tenor.com/view/abc.gif")).toBe(true);
    expect(isImageContent("só um texto")).toBe(false);
    expect(isImageContent("")).toBe(false);
  });
});

describe("parseLocationMessage", () => {
  it("extrai a URL e as coordenadas do formato do web", () => {
    const loc = parseLocationMessage("📍 Localização partilhada:\nhttp://maps.google.com/maps?q=-3.73,-38.52");
    expect(loc).toMatchObject({ latitude: -3.73, longitude: -38.52 });
    expect(loc.mapsUrl).toContain("maps.google.com");
  });
  it("devolve null para texto normal", () => {
    expect(parseLocationMessage("oi, tudo bem?")).toBeNull();
  });
});

describe("normalizeMessage — imagem, localização e citação", () => {
  it("marca imagem e não confunde com localização", () => {
    const m = normalizeMessage({ id: 1, content: "https://res.cloudinary.com/x/a.jpg" }, ME);
    expect(m.isImage).toBe(true);
    expect(m.location).toBeNull();
  });
  it("preenche location para mensagem de localização", () => {
    const m = normalizeMessage({ id: 2, content: "📍 Localização partilhada:\nhttp://maps.google.com/maps?q=1,2" }, ME);
    expect(m.isImage).toBe(false);
    expect(m.location).toMatchObject({ latitude: 1, longitude: 2 });
  });
  it("lê a citação de resposta quando presente", () => {
    const m = normalizeMessage({ id: 3, content: "resposta", reply_to_content: "original", reply_to_sender: "Você" }, ME);
    expect(m.replyTo).toEqual({ content: "original", sender: "Você" });
  });
});

describe("createPendingMessage/Image — reply e imagem otimista", () => {
  it("carrega a citação na bolha otimista", () => {
    const m = createPendingMessage("t1", "oi", { replyTo: { content: "cit", sender: "Você" } });
    expect(m.replyTo).toEqual({ content: "cit", sender: "Você" });
    expect(m.status).toBe("pending");
  });
  it("imagem otimista mostra a uri local", () => {
    const m = createPendingImageMessage("t1", "file:///local/a.jpg");
    expect(m).toMatchObject({ isImage: true, text: "file:///local/a.jpg", status: "pending" });
  });
});

describe("confirmPendingMessage — preserva a citação local", () => {
  it("mantém o replyTo da bolha otimista ao confirmar", () => {
    const list = [createPendingMessage("t1", "oi", { replyTo: { content: "cit", sender: "Você" } })];
    const next = confirmPendingMessage(list, "t1", { id: 9, sender_id: ME, content: "oi" }, ME);
    expect(next[0]).toMatchObject({ id: "9", status: "sent" });
    expect(next[0].replyTo).toEqual({ content: "cit", sender: "Você" });
  });
});

import {
  INVITE_TAG,
  buildInviteMessage,
  parseInviteMessage,
  inviteStatusFromText,
  applyInviteResponse,
} from "../../src/utils/chatMessages";

describe("convite de encontro", () => {
  const payload = { conversation_id: 9, other_user_id: "u2", titulo: "Café", scheduled_at: "2026-11-18T15:07", local: "Centro", nota: "" };

  it("buildInviteMessage usa a TAG + JSON e parseInviteMessage reverte", () => {
    const text = buildInviteMessage(payload);
    expect(text.startsWith(INVITE_TAG)).toBe(true);
    expect(parseInviteMessage(text)).toEqual(payload);
  });

  it("parseInviteMessage devolve null para texto normal ou JSON inválido", () => {
    expect(parseInviteMessage("oi")).toBeNull();
    expect(parseInviteMessage("[CONVITE_EVENTO]{quebrado")).toBeNull();
  });

  it("normalizeMessage marca invite e não trata como imagem/localização", () => {
    const m = normalizeMessage({ id: 1, sender_id: ME, content: buildInviteMessage(payload) }, ME);
    expect(m.invite).toEqual(payload);
    expect(m.isImage).toBe(false);
    expect(m.location).toBeNull();
    expect(m.inviteStatus).toBeNull();
  });

  it("inviteStatusFromText reconhece aceite/recusado", () => {
    expect(inviteStatusFromText("✅ Convite Aceite!")).toBe("accepted");
    expect(inviteStatusFromText("❌ Convite Recusado")).toBe("rejected");
    expect(inviteStatusFromText("oi")).toBeNull();
  });

  it("applyInviteResponse troca o conteúdo pelo status e remove o card", () => {
    const list = [normalizeMessage({ id: 1, sender_id: ME, content: buildInviteMessage(payload) }, ME)];
    const accepted = applyInviteResponse(list, "1", "aceite");
    expect(accepted[0].invite).toBeNull();
    expect(accepted[0].text).toBe("✅ Convite Aceite!");
    expect(accepted[0].inviteStatus).toBe("accepted");
    const rejected = applyInviteResponse(list, "1", "recusado");
    expect(rejected[0].text).toBe("❌ Convite Recusado");
  });
});

// --- Confirmação de envio/entrega/leitura (checks estilo WhatsApp) ---------
describe("status de entrega/leitura", () => {
  it("statusFromRaw lê o campo status da API", () => {
    expect(statusFromRaw({ status: "read" })).toBe(MESSAGE_STATUS.READ);
    expect(statusFromRaw({ status: "delivered" })).toBe(MESSAGE_STATUS.DELIVERED);
    expect(statusFromRaw({ status: "sent" })).toBe(MESSAGE_STATUS.SENT);
  });

  it("statusFromRaw cai nos carimbos quando não vem `status` (payload antigo)", () => {
    expect(statusFromRaw({ read_at: "2026-11-18T19:16:00Z" })).toBe(MESSAGE_STATUS.READ);
    expect(statusFromRaw({ delivered_at: "2026-11-18T19:16:00Z" })).toBe(MESSAGE_STATUS.DELIVERED);
    expect(statusFromRaw({})).toBe(MESSAGE_STATUS.SENT);
  });

  it("normalizeMessage traz o status vindo da API", () => {
    const msg = normalizeMessage(
      { id: 1, content: "oi", sender_id: "me", status: "read" },
      "me"
    );
    expect(msg.status).toBe(MESSAGE_STATUS.READ);
  });

  it("applyStatusUpdate avança só as MINHAS mensagens listadas", () => {
    const list = [
      { id: "1", isMine: true, status: MESSAGE_STATUS.SENT },
      { id: "2", isMine: true, status: MESSAGE_STATUS.SENT },
      { id: "3", isMine: false, status: MESSAGE_STATUS.SENT },
    ];
    const out = applyStatusUpdate(list, ["1", "3"], MESSAGE_STATUS.READ);
    expect(out[0].status).toBe(MESSAGE_STATUS.READ);
    expect(out[1].status).toBe(MESSAGE_STATUS.SENT); // não estava na lista
    expect(out[2].status).toBe(MESSAGE_STATUS.SENT); // recebida: sem checks
  });

  it("applyStatusUpdate nunca regride (read não volta para delivered)", () => {
    const list = [{ id: "1", isMine: true, status: MESSAGE_STATUS.READ }];
    const out = applyStatusUpdate(list, ["1"], MESSAGE_STATUS.DELIVERED);
    expect(out[0].status).toBe(MESSAGE_STATUS.READ);
  });

  it("Modo Discreto: o servidor manda 'delivered' e os checks nunca ficam azuis", () => {
    const list = [{ id: "1", isMine: true, status: MESSAGE_STATUS.SENT }];
    // Com Modo Discreto ligado o backend emite delivered (nunca read).
    const out = applyStatusUpdate(list, ["1"], MESSAGE_STATUS.DELIVERED);
    expect(out[0].status).toBe(MESSAGE_STATUS.DELIVERED);
    expect(out[0].status).not.toBe(MESSAGE_STATUS.READ);
  });
});
