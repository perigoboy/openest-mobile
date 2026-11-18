import api from "../../src/services/api";
import {
  fetchConversations,
  findConversationContact,
  findConversationWithUser,
} from "../../src/services/conversations";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe("conversations service", () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it("fetches conversations from the authenticated conversations endpoint", async () => {
    const conversations = [
      {
        id: 8,
        name: "Ana Lima",
        img: "https://example.com/ana.jpg",
        timestamp: "Agora",
        lastMessage: "Oi!",
      },
    ];
    api.get.mockResolvedValue({ data: conversations });

    await expect(fetchConversations()).resolves.toEqual(conversations);
    expect(api.get).toHaveBeenCalledWith("/api/conversas");
  });

  it("rejects responses that do not match the endpoint contract", async () => {
    api.get.mockResolvedValue({ data: { conversations: [] } });

    await expect(fetchConversations()).rejects.toThrow(
      "A resposta da lista de conversas está em um formato inválido."
    );
  });
});


describe("busca de conversa para o Chat (T049 / modal de match)", () => {
  const LIST = [
    { id: 8, other_user_id: "u-ana", name: "Ana Lima", img: "https://example.com/ana.jpg" },
    { id: 9, other_user_id: "u-bruno", name: "Bruno", img: "" },
  ];

  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: LIST });
  });

  it("findConversationContact devolve o contato pelo id da conversa (aceita string)", async () => {
    await expect(findConversationContact("8")).resolves.toEqual({
      id: "u-ana",
      name: "Ana Lima",
      avatar: "https://example.com/ana.jpg",
    });
    await expect(findConversationContact(9)).resolves.toEqual({ id: "u-bruno", name: "Bruno", avatar: null });
  });

  it("findConversationWithUser acha a conversa do match pelo id do outro usuário", async () => {
    await expect(findConversationWithUser("u-bruno")).resolves.toEqual({
      conversationId: 9,
      contact: { id: "u-bruno", name: "Bruno", avatar: null },
    });
  });

  it("devolve null quando não existe (ex.: match desfeito) ou sem id", async () => {
    await expect(findConversationContact(999)).resolves.toBeNull();
    await expect(findConversationWithUser("ninguem")).resolves.toBeNull();
    await expect(findConversationWithUser(null)).resolves.toBeNull();
    await expect(findConversationContact("")).resolves.toBeNull();
  });
});
