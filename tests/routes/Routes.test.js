// tests/routes/Routes.test.js
// T051 — a SplashScreen nativa só some depois que o AuthContext decidiu a rota.
import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import * as SplashScreen from "expo-splash-screen";
import Routes from "../../src/routes";

let mockAuth = { signed: false, loading: true };
jest.mock("../../src/contexts/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("expo-splash-screen", () => ({ hideAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../../src/routes/AuthRoutes", () => {
  const { Text } = require("react-native");
  return () => <Text>área pública</Text>;
});
jest.mock("../../src/routes/AppRoutes", () => {
  const { Text } = require("react-native");
  return () => <Text>área logada</Text>;
});
jest.mock("../../src/components", () => {
  const { Text } = require("react-native");
  return { Loader: () => <Text>carregando</Text> };
});

beforeEach(() => jest.clearAllMocks());

describe("Routes + SplashScreen (T051)", () => {
  it("mantém a splash enquanto lê o token salvo", () => {
    mockAuth = { signed: false, loading: true };
    render(<Routes />);

    expect(screen.getByText("carregando")).toBeTruthy();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("esconde a splash e mostra o login quando não há sessão", () => {
    mockAuth = { signed: false, loading: false };
    render(<Routes />);

    expect(screen.getByText("área pública")).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("esconde a splash e vai direto para a área logada quando há sessão", () => {
    mockAuth = { signed: true, loading: false };
    render(<Routes />);

    expect(screen.getByText("área logada")).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("não quebra se a splash já tiver sido escondida", async () => {
    SplashScreen.hideAsync.mockRejectedValueOnce(new Error("No native splash screen registered"));
    mockAuth = { signed: true, loading: false };

    expect(() => render(<Routes />)).not.toThrow();
    expect(await screen.findByText("área logada")).toBeTruthy();
  });
});
