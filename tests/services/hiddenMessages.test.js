// tests/services/hiddenMessages.test.js — "Apagar p/ mim" (local, por usuário)
import * as SecureStore from "expo-secure-store";
import { getHiddenMessageIds, hideMessageForMe } from "../../src/services/hiddenMessages";

beforeEach(() => jest.clearAllMocks());

describe("hiddenMessages", () => {
  it("lista vazia quando não há nada salvo", async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    await expect(getHiddenMessageIds("u1")).resolves.toEqual([]);
  });

  it("esconde um id e persiste por usuário", async () => {
    SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(["1"]));
    const next = await hideMessageForMe("u1", 2);
    expect(next).toEqual(["1", "2"]);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("openest_hidden_msgs_u1", JSON.stringify(["1", "2"]));
  });

  it("não duplica id já escondido", async () => {
    SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(["5"]));
    const next = await hideMessageForMe("u1", "5");
    expect(next).toEqual(["5"]);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("usuários diferentes têm chaves diferentes", async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    await hideMessageForMe("u2", 9);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("openest_hidden_msgs_u2", JSON.stringify(["9"]));
  });

  it("tolera JSON corrompido", async () => {
    SecureStore.getItemAsync.mockResolvedValue("{quebrado");
    await expect(getHiddenMessageIds("u1")).resolves.toEqual([]);
  });
});
