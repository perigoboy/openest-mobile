// tests/accessibility/labels.test.js
// T052 — labels de acessibilidade (accessibilityLabel) nos componentes principais.
// Regra: todo controle interativo precisa de um nome que o TalkBack/VoiceOver
// consiga ler — seja um accessibilityLabel, seja o texto visível do botão.
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { GlassTabBar, TAB_LABELS } from "../../src/routes/AppRoutes";
import Input from "../../src/components/Input";
import NetworkErrorBanner from "../../src/components/NetworkErrorBanner";
import Login from "../../src/screens/Login";
import Chat from "../../src/screens/Chat";
import Matches from "../../src/screens/Matches";
import SearchPreferences from "../../src/screens/SearchPreferences";
import { __resetNetworkErrorsForTests, enqueueFailedRequest } from "../../src/services/networkErrors";
import { fetchConversations } from "../../src/services/conversations";
import { loadPreferences } from "../../src/services/searchPreferences";
import { accessibleName, findUnnamedControls } from "../helpers/a11y";

// As telas reais do AppRoutes não são necessárias para testar a tab bar.
jest.mock("../../src/screens/Discovery", () => () => null);
jest.mock("../../src/screens/Profile", () => () => null);
jest.mock("../../src/screens/Settings", () => () => null);
jest.mock("../../src/screens/PhotoVerification", () => () => null);
jest.mock("../../src/screens/Encontros", () => () => null);

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { BlurView: View };
});
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

jest.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me" }, signIn: jest.fn() }),
}));
jest.mock("../../src/hooks/useChat", () => ({
  useChat: () => ({
    messages: [
      { id: "1", text: "Oi", time: "10:00", isMine: false, isImage: false, status: "sent" },
      { id: "t", text: "falhou", time: "10:01", isMine: true, isImage: false, status: "failed" },
    ],
    loading: false,
    error: null,
    connected: false,
    sendMessage: jest.fn(),
    retryMessage: jest.fn(),
    reload: jest.fn(),
  }),
}));
jest.mock("../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
  findConversationContact: jest.fn().mockResolvedValue(null),
}));
jest.mock("../../src/services/searchPreferences", () => {
  const actual = jest.requireActual("../../src/services/searchPreferences");
  return { ...actual, loadPreferences: jest.fn(), savePreferences: jest.fn() };
});

describe("tab bar (navegação principal)", () => {
  const state = {
    index: 0,
    routes: ["Discovery", "SearchPreferences", "Matches", "Chat", "Encontros", "Profile", "Settings", "PhotoVerification"].map(
      (name) => ({ key: `${name}-key`, name })
    ),
  };

  it("cada aba tem nome em português, papel de aba e indica a selecionada", () => {
    render(<GlassTabBar state={state} navigation={{ navigate: jest.fn() }} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map(accessibleName)).toEqual(["Descobrir", "Conversas", "Encontros", "Perfil", "Configurações"]);
    expect(tabs[0].props.accessibilityState).toEqual({ selected: true });
    expect(tabs[1].props.accessibilityState).toEqual({ selected: false });
  });

  it("não expõe nomes internos em inglês para o leitor de tela", () => {
    render(<GlassTabBar state={state} navigation={{ navigate: jest.fn() }} />);
    expect(screen.queryByLabelText("Discovery")).toBeNull();
    expect(screen.queryByLabelText("Settings")).toBeNull();
    expect(Object.values(TAB_LABELS)).toHaveLength(5);
  });
});

describe("componente Input", () => {
  it("usa o label visível como rótulo acessível", () => {
    render(<Input label="E-mail" testID="i" />);
    expect(screen.getByLabelText("E-mail")).toBeTruthy();
  });

  it("sem label, usa o placeholder; label explícito tem prioridade", () => {
    render(<Input placeholder="Buscar" testID="a" />);
    expect(screen.getByLabelText("Buscar")).toBeTruthy();

    render(<Input placeholder="x" accessibilityLabel="Mensagem" testID="b" />);
    expect(screen.getByLabelText("Mensagem")).toBeTruthy();
  });

  it("anuncia o erro do campo como dica", () => {
    render(<Input label="Senha" error="Senha muito curta" testID="i" />);
    expect(screen.getByTestId("i").props.accessibilityHint).toBe("Senha muito curta");
  });
});

describe("telas principais: nenhum controle sem nome", () => {
  beforeEach(() => __resetNetworkErrorsForTests());

  it("Login: campos e botões rotulados", () => {
    render(<Login navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByLabelText("E-mail")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3);
    expect(findUnnamedControls(screen)).toEqual([]);
  });

  it("Chat: botões só com ícone têm nome", () => {
    render(<Chat navigation={{ navigate: jest.fn() }} route={{ params: { conversationId: 1, contact: { id: "u", name: "Ana" } } }} />);

    expect(screen.getByLabelText("Voltar para conversas")).toBeTruthy();
    expect(screen.getByLabelText("Mais opções")).toBeTruthy();
    expect(screen.getByLabelText("Enviar mensagem")).toBeTruthy();
    expect(screen.getByLabelText("Mensagem")).toBeTruthy();
    expect(screen.getByLabelText("Mensagem não enviada. Toque para tentar de novo")).toBeTruthy();
    expect(findUnnamedControls(screen)).toEqual([]);
  });

  it("Matches: botão de opções diz de qual conversa é", async () => {
    fetchConversations.mockResolvedValue([{ id: 1, name: "Ana Lima", img: "", timestamp: "Agora", lastMessage: "Oi" }]);
    render(<Matches navigation={{ navigate: jest.fn() }} />);

    expect(await screen.findByLabelText("Abrir conversa com Ana Lima")).toBeTruthy();
    expect(screen.getByLabelText("Mais opções da conversa com Ana Lima")).toBeTruthy();
    expect(findUnnamedControls(screen)).toEqual([]);
  });

  it("SearchPreferences: steppers falam o nome do filtro em português", async () => {
    loadPreferences.mockResolvedValue({ minAge: 18, maxAge: 35, maxDistanceKm: 25, gender: "all" });
    render(<SearchPreferences navigation={{ goBack: jest.fn() }} route={{ params: {} }} />);

    expect(await screen.findByLabelText("Diminuir idade mínima")).toBeTruthy();
    expect(screen.getByLabelText("Aumentar distância máxima")).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText("idade mínima: 18")).toBeTruthy());
    // No mínimo permitido, "diminuir" é anunciado como desabilitado.
    expect(screen.getByLabelText("Diminuir idade mínima").props.accessibilityState).toEqual({ disabled: true });
    expect(findUnnamedControls(screen)).toEqual([]);
  });

  it("banner de erro de rede: ações rotuladas e aviso anunciado", () => {
    render(<NetworkErrorBanner />);
    act(() => {
      enqueueFailedRequest({ kind: "offline", error: new Error("x"), retry: jest.fn() }).catch(() => {});
    });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(findUnnamedControls(screen)).toEqual([]);
  });
});
