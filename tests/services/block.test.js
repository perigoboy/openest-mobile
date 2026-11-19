import api from "../../src/services/api";
import { blockUser } from "../../src/services/block";

jest.mock("../../src/services/api", () => ({ __esModule: true, default: { post: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

describe("blockUser", () => {
  it("usa a rota REAL /api/passar/:id (antes era /api/bloquear → 404)", async () => {
    api.post.mockResolvedValue({ data: { message: "ok" } });
    await blockUser("u-123");
    expect(api.post).toHaveBeenCalledWith("/api/passar/u-123");
  });
  it("rejeita sem id", async () => {
    await expect(blockUser(null)).rejects.toThrow("identificar o usuário");
  });
});
