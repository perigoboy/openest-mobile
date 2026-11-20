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

  // As opções da conversa ficam no TOQUE LONGO (padrão WhatsApp), numa gaveta.
  async function abrirOpcoes(id) {
    await act(async () => {
      fireEvent(screen.getByTestId(`conversation-${id}`), "longPress");
    });
  }

  it("toque longo abre a gaveta com 'Desfazer match' (destrutivo)", async () => {
    render(<Matches />);
    await act(async () => {});

    await abrirOpcoes(1);

    expect(screen.getByTestId("conversation-action-unmatch")).toBeTruthy();
    expect(screen.getByText("Desfazer match")).toBeTruthy();
    expect(screen.getByTestId("conversation-sheet-cancel")).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled(); // nada de Alert para o menu
  });

  it("dispara unmatch com sucesso e remove a conversa da lista", async () => {
    render(<Matches />);
    await act(async () => {});

    await abrirOpcoes(1);
    await act(async () => {
      fireEvent.press(screen.getByTestId("conversation-action-unmatch"));
    });

    // A confirmação continua sendo um diálogo nativo
    expect(Alert.alert).toHaveBeenCalledWith(
      "Desfazer match",
      expect.stringContaining("Tem certeza que deseja desfazer o match com Ana Lima?"),
      expect.any(Array)
    );

    const confirmAlertOptions = Alert.alert.mock.calls[0][2];
    const confirmBtn = confirmAlertOptions.find((opt) => opt.text === "Desfazer");
    await act(async () => {
      await confirmBtn.onPress();
    });

    expect(unmatch).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Ana Lima")).toBeNull();
    expect(screen.getByText("Carlos")).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Match desfeito",
      "A conversa foi removida da sua lista."
    );
  });

  it("exibe Alert de erro se o unmatch falhar e mantém a conversa na lista", async () => {
    unmatch.mockRejectedValueOnce({ response: { data: { error: "Erro no servidor" } } });

    render(<Matches />);
    await act(async () => {});

    await abrirOpcoes(1);
    await act(async () => {
      fireEvent.press(screen.getByTestId("conversation-action-unmatch"));
    });
    const confirmBtn = Alert.alert.mock.calls[0][2].find((opt) => opt.text === "Desfazer");
    await act(async () => { await confirmBtn.onPress(); });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Não foi possível desfazer o match",
      "Erro no servidor"
    );
    expect(screen.getByText("Ana Lima")).toBeTruthy();
  });
});