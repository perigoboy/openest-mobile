import api from "../../src/services/api";
import { submitReport } from "../../src/services/moderation";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe("moderation service", () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it("posts the reported user, reason, and optional description", async () => {
    api.post.mockResolvedValue({ data: { report_id: 12 } });

    await expect(
      submitReport(42, "Golpe, fraude ou spam", "Perfil enviou links suspeitos")
    ).resolves.toEqual({ report_id: 12 });

    expect(api.post).toHaveBeenCalledWith("/api/denunciar", {
      reported_id: 42,
      reason: "Golpe, fraude ou spam",
      description: "Perfil enviou links suspeitos",
    });
  });

  it("requires a target profile and a reason", async () => {
    await expect(submitReport(null, "Spam")).rejects.toThrow(
      "Não foi possível identificar o perfil denunciado."
    );
    await expect(submitReport(42, "")).rejects.toThrow(
      "Selecione um motivo para a denúncia."
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
