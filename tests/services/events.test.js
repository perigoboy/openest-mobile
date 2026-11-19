import api from "../../src/services/api";
import { createEvent, respondInvite, cancelEvent } from "../../src/services/events";

jest.mock("../../src/services/api", () => ({ __esModule: true, default: { post: jest.fn(), delete: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

describe("events service", () => {
  it("createEvent → POST /api/events/agendar", async () => {
    api.post.mockResolvedValue({ data: { ok: true } });
    const payload = { conversation_id: 9, other_user_id: "u2", titulo: "Café", scheduled_at: "x" };
    await createEvent(payload);
    expect(api.post).toHaveBeenCalledWith("/api/events/agendar", payload);
  });
  it("respondInvite → POST /api/mensagens/:id/responder", async () => {
    api.post.mockResolvedValue({ data: {} });
    await respondInvite(42, "aceite");
    expect(api.post).toHaveBeenCalledWith("/api/mensagens/42/responder", { resposta: "aceite" });
  });
  it("cancelEvent → DELETE /api/events/cancelar/:id", async () => {
    api.delete.mockResolvedValue({ data: {} });
    await cancelEvent("sched-3");
    expect(api.delete).toHaveBeenCalledWith("/api/events/cancelar/sched-3");
  });
});
