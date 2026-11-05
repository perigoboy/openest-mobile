import api from "../../src/services/api";
import { fetchConversations } from "../../src/services/conversations";

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
