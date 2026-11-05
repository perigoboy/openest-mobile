import api from "../../src/services/api";
import { likeProfile } from "../../src/services/interactions";

jest.mock("../../src/services/api", () => ({
  post: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("interactions", () => {
  it("posts a like and returns the confirmed match result", async () => {
    api.post.mockResolvedValueOnce({ data: { match: true } });

    await expect(likeProfile("user/42")).resolves.toBe(true);
    expect(api.post).toHaveBeenCalledWith("/api/curtir/user%2F42");
  });

  it("returns false when the API confirms there is no match", async () => {
    api.post.mockResolvedValueOnce({ data: { match: false } });

    await expect(likeProfile(42)).resolves.toBe(false);
  });

  it("rejects malformed responses and missing profile IDs", async () => {
    api.post.mockResolvedValueOnce({ data: { message: "ok" } });

    await expect(likeProfile(42)).rejects.toThrow("não contém o resultado do match");
    await expect(likeProfile(null)).rejects.toThrow("sem identificador");
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
