// tests/screens/Matches/MatchesActions.test.js
// T044 — Testes de integração da tela de Matches (Unmatch - T041).

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Matches from "../../../src/screens/Matches";
import { fetchConversations } from "../../../src/services/conversations";
import { unmatch } from "../../../src/services/match";

// Peculiaridade #1 — Mock do TouchableOpacity
jest.mock(
  "react-native/Libraries/Components/Touchable/TouchableOpacity",
  () => {
    const React = require("react");
    const { View } = require("react-native");
    const Mocked = React.forwardRef((props, ref) => {
      const { children, onPress, disabled, testID, style, accessibilityRole } = props;
      return React.createElement(
        View,
        { ref, testID, accessibilityRole: accessibilityRole || "button", accessibilityState: { disabled: !!disabled }, style, onPress: disabled ? undefined : onPress },
        children
      );
    });
    Mocked.displayName = "TouchableOpacity";
    return { __esModule: true, default: Mocked, TouchableOpacity: Mocked };
  }
);

// Mocks de serviços
jest.mock("../../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
}));
jest.mock("../../../src/services/match", () => ({
  unmatch: jest.fn(),
}));

// Mock do Avatar (barrel)
jest.mock("../../../src/components", () => ({
  Avatar: () => null,
}));

const mockConversations = [
  { id: 1, name: "Ana Lima", img: "ana.jpg", timestamp: "Agora", lastMessage: "Oi!" },
  { id: 2, name: "Carlos", img: "carlos.jpg", timestamp: "Ontem", lastMessage: "E aí?" },
];

async function pressButton(testID) {
  const el = screen.getByTestId(testID);
  await act(async () => {
    if (typeof el.props.onPress === "function") {
      await el.props.onPress();
    }
  });
}

describe("Matches — Fluxo de Unmatch (T044)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    fetchConversations.mockResolvedValue(mockConversations);
    unmatch.mockResolvedValue({ success: true });
  });

  it("renderiza a lista de conversas com sucesso", async () => {
    render(<Matches />);
    await act(async () => {});
    
    expect(screen.getByText("Ana Lima")).toBeTruthy();
    expect(screen.getByText("Carlos")).toBeTruthy();
  });

  it("abre o menu de opções (ellipsis) ao clicar", async () => {
    render(<Matches />);
    await act(async () => {});
    
    await pressButton("conversation-options-1");
    
    // Pega a primeira chamada do Alert.alert (abertura do menu)
    const alertCall = Alert.alert.mock.calls[0];
    
    expect(alertCall[0]).toBe("Opções");
    expect(alertCall[1]).toBeUndefined();
    
    // Verifica que o array de botões contém a opção "Desfazer match"
    // com style "destructive" e a opção "Cancelar"
    const options = alertCall[2];
    expect(options.some((opt) => opt.text === "Desfazer match" && opt.style === "destructive")).toBe(true);
    expect(options.some((opt) => opt.text === "Cancelar" && opt.style === "cancel")).toBe(true);
  });

  it("dispara unmatch com sucesso e remove a conversa da lista", async () => {
    render(<Matches />);
    await act(async () => {});

    // Abre o menu de opções
    await pressButton("conversation-options-1");
    
    // Pega a função onPress do botão "Desfazer match" do Alert
    const alertOptions = Alert.alert.mock.calls[0][2];
    const desfazerBtn = alertOptions.find((opt) => opt.text === "Desfazer match");
    
    // Executa a ação de desfazer
    await act(async () => {
      await desfazerBtn.onPress();
    });

    // O Alert de confirmação deve aparecer
    expect(Alert.alert).toHaveBeenCalledWith(
      "Desfazer match",
      expect.stringContaining("Tem certeza que deseja desfazer o match com Ana Lima?"),
      expect.any(Array)
    );

    // Pega a função onPress do botão "Desfazer" (confirmar) do segundo Alert
    const confirmAlertOptions = Alert.alert.mock.calls[1][2];
    const confirmBtn = confirmAlertOptions.find((opt) => opt.text === "Desfazer");

    // Confirma o unmatch
    await act(async () => {
      await confirmBtn.onPress();
    });

    // Verifica as chamadas de serviço
    expect(unmatch).toHaveBeenCalledWith(1);
    
    // Verifica se a conversa da Ana sumiu da tela
    expect(screen.queryByText("Ana Lima")).toBeNull();
    expect(screen.getByText("Carlos")).toBeTruthy();

    // Verifica o Alert de sucesso
    expect(Alert.alert).toHaveBeenCalledWith(
      "Match desfazido",
      "A conversa foi removida da sua lista."
    );
  });

  it("exibe Alert de erro se o unmatch falhar e mantém a conversa na lista", async () => {
    // Simula erro no backend
    unmatch.mockRejectedValueOnce({ response: { data: { error: "Erro no servidor" } } });

    render(<Matches />);
    await act(async () => {});

    // Fluxo completo de abrir, confirmar e falhar
    await pressButton("conversation-options-1");
    const alertOptions = Alert.alert.mock.calls[0][2];
    const desfazerBtn = alertOptions.find((opt) => opt.text === "Desfazer match");
    await act(async () => { await desfazerBtn.onPress(); });

    const confirmAlertOptions = Alert.alert.mock.calls[1][2];
    const confirmBtn = confirmAlertOptions.find((opt) => opt.text === "Desfazer");
    await act(async () => { await confirmBtn.onPress(); });

    // O Alert de erro deve ser chamado
    expect(Alert.alert).toHaveBeenCalledWith(
      "Não foi possível desfazer o match",
      "Erro no servidor"
    );

    // A conversa deve continuar na tela
    expect(screen.getByText("Ana Lima")).toBeTruthy();
  });
});