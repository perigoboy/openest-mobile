// tests/services/matchAndBlock.test.js
// T044 — Testes de integração dos serviços de Match (Unmatch) e Bloqueio.
// Cobre os fluxos de sucesso e erro das T037 e T041, que não tinham testes.

import api from "../../src/services/api";
import { unmatch } from "../../src/services/match";
import { blockUser } from "../../src/services/block";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
    post: jest.fn(),
  },
}));

describe("match service — unmatch (T041)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispara DELETE /api/match/:id e retorna os dados", async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    const result = await unmatch(123);
    
    expect(api.delete).toHaveBeenCalledWith("/api/match/123");
    expect(result).toEqual({ success: true });
  });

  it("lança erro se o matchId for nulo", async () => {
    await expect(unmatch(null)).rejects.toThrow(
      "Não foi possível identificar o match a ser removido."
    );
    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe("block service — blockUser (T037)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispara POST /api/bloquear com o ID do usuário bloqueado", async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await blockUser(42);
    
    expect(api.post).toHaveBeenCalledWith("/api/bloquear", {
      blocked_id: 42,
    });
    expect(result).toEqual({ success: true });
  });

  it("lança erro se o ID for nulo", async () => {
    await expect(blockUser(null)).rejects.toThrow(
      "Não foi identificar o usuário a ser bloqueado."
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});