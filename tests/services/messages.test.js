// tests/services/messages.test.js — T045 (rotas REST do chat)
import api from "../../src/services/api";
import { fetchMessages, sendMessageRest } from "../../src/services/messages";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe("fetchMessages", () => {
  it("usa a rota paginada do backend", async () => {
    api.get.mockResolvedValue({ data: { messages: [{ id: 1 }], pagination: { hasNext: true } } });

    await expect(fetchMessages(17)).resolves.toEqual({ messages: [{ id: 1 }], hasNext: true });
    expect(api.get).toHaveBeenCalledWith("/api/17/mensagens", { params: { page: 1, limit: 30 } });
  });

  it("rejeita resposta fora do contrato", async () => {
    api.get.mockResolvedValue({ data: [] });
    await expect(fetchMessages(17)).rejects.toThrow("formato inválido");
  });

  it("rejeita conversa sem id sem chamar a API", async () => {
    await expect(fetchMessages(undefined)).rejects.toThrow("Conversa inválida.");
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe("sendMessageRest", () => {
  it("envia no formato esperado pelo messageController", async () => {
    api.post.mockResolvedValue({ data: { id: 3, content: "oi" } });

    await expect(sendMessageRest(17, "oi")).resolves.toEqual({ id: 3, content: "oi" });
    expect(api.post).toHaveBeenCalledWith("/api/mensagens", { conversation_id: 17, content: "oi" });
  });
});
