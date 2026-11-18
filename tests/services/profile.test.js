// tests/services/profile.test.js — perfil do usuário (mesmo contrato do web)
import api from "../../src/services/api";
import { fetchMyProfile, updateMyProfile } from "../../src/services/profile";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe("profile service", () => {
  it("fetchMyProfile busca GET /api/users/perfil", async () => {
    api.get.mockResolvedValue({ data: { name: "Ana", foto_url: "https://x/a.jpg" } });
    await expect(fetchMyProfile()).resolves.toEqual({ name: "Ana", foto_url: "https://x/a.jpg" });
    expect(api.get).toHaveBeenCalledWith("/api/users/perfil");
  });

  it("fetchMyProfile devolve objeto vazio se a API não trouxer corpo", async () => {
    api.get.mockResolvedValue({});
    await expect(fetchMyProfile()).resolves.toEqual({});
  });

  it("updateMyProfile faz PUT /api/users/perfil com o payload", async () => {
    api.put.mockResolvedValue({ data: { user: { name: "Ana Lima" } } });
    const payload = { name: "Ana Lima", bio: "oi", status_relacionamento: "individual", photos: [], foto_url: null };
    await updateMyProfile(payload);
    expect(api.put).toHaveBeenCalledWith("/api/users/perfil", payload);
  });
});
