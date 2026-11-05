// tests/screens/Discovery/DiscoveryActions.test.js
// T044 — Testes do fluxo de interação da tela de Discovery:
// Like -> Modal "It's a Match!", Denúncia e Bloqueio.

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Discovery from "../../../src/screens/Discovery";
import { fetchCompatibleProfiles } from "../../../src/services/discovery";
import { likeProfile } from "../../../src/services/interactions";
import { submitReport } from "../../../src/services/moderation";
import { blockUser } from "../../../src/services/block";

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

// Mocks dos serviços
jest.mock("../../../src/services/discovery", () => ({
  fetchCompatibleProfiles: jest.fn(),
  avatarFallback: jest.fn(() => "fallback.png"),
}));
jest.mock("../../../src/services/interactions", () => ({
  likeProfile: jest.fn(),
}));
jest.mock("../../../src/services/moderation", () => ({
  submitReport: jest.fn(),
  REPORT_REASONS: ["Golpe", "Nudez"],
}));
jest.mock("../../../src/services/block", () => ({
  blockUser: jest.fn(),
}));
jest.mock("../../../src/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Teste", photos: [] } }),
}));
jest.mock("../../../src/services/userLocation", () => ({
  distanceKm: jest.fn(),
}));

// Mock do componente DiscoveryCard para facilitar o disparo dos botões
jest.mock("../../../src/components/DiscoveryCard", () => {
  const { View, TouchableOpacity } = require("react-native");
  return ({ profile, onSwipe, onReportPress, onBlockPress }) => (
    <View testID="mock-discovery-card">
      <TouchableOpacity testID="btn-like-mock" onPress={() => onSwipe("like")} />
      <TouchableOpacity testID="btn-report-mock" onPress={onReportPress} />
      <TouchableOpacity testID="btn-block-mock" onPress={onBlockPress} />
    </View>
  );
});

const mockProfile = {
  id: 99,
  name: "Fulano",
  photo: "http://test.com/foto.jpg",
};

async function pressButton(testID) {
  const el = screen.getByTestId(testID);
  await act(async () => {
    if (typeof el.props.onPress === "function") {
      await el.props.onPress();
    }
  });
}

describe("Discovery — Fluxos de Match e Moderação (T044)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    fetchCompatibleProfiles.mockResolvedValue({ profiles: [mockProfile] });
    likeProfile.mockResolvedValue(false); // padrão: sem match
  });

  it("exibe o Modal 'It's a Match!' quando a API retorna match: true", async () => {
    likeProfile.mockResolvedValueOnce(true);
    
    render(<Discovery />);
    await act(async () => {}); // aguarda o fetch inicial
    
    await pressButton("btn-like-mock");
    
    expect(likeProfile).toHaveBeenCalledWith(99);
    await waitFor(() => {
      expect(screen.getByText("It's a Match!")).toBeTruthy();
    });
  });

  it("NÃO exibe o Modal quando a API retorna match: false", async () => {
    likeProfile.mockResolvedValueOnce(false);
    
    render(<Discovery />);
    await act(async () => {});
    
    await pressButton("btn-like-mock");
    
    expect(screen.queryByText("It's a Match!")).toBeNull();
  });

  it("fecha o Modal ao clicar em 'Continuar descobrindo'", async () => {
    likeProfile.mockResolvedValueOnce(true);
    
    render(<Discovery />);
    await act(async () => {});
    
    await pressButton("btn-like-mock");
    await waitFor(() => screen.getByText("It's a Match!"));

    await pressButton("btn-match-continue");
    
    expect(screen.queryByText("It's a Match!")).toBeNull();
  });

  it("envia a denúncia com sucesso e oculta o perfil do deck", async () => {
    submitReport.mockResolvedValueOnce({ success: true });
    
    render(<Discovery />);
    await act(async () => {});
    
    // Abre modal de denúncia
    await pressButton("btn-report-mock");
    
    // Seleciona motivo (index 0) e submete
    await pressButton("report-reason-0");
    await pressButton("submit-report");
    
    expect(submitReport).toHaveBeenCalledWith(99, "Golpe", "");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Denúncia enviada",
      expect.any(String)
    );
    // O card deve sumir da tela
    expect(screen.queryByTestId("mock-discovery-card")).toBeNull();
  });

  it("exibe Alert de erro se a denúncia falhar e mantém o modal aberto", async () => {
    submitReport.mockRejectedValueOnce({ response: { data: { error: "Falha no servidor" } } });
    
    render(<Discovery />);
    await act(async () => {});
    
    await pressButton("btn-report-mock");
    await pressButton("report-reason-0");
    await pressButton("submit-report");
    
    expect(Alert.alert).toHaveBeenCalledWith(
      "Não foi possível denunciar",
      "Falha no servidor"
    );
    // O modal não deve fechar (perfil ainda está na tela)
    expect(screen.getByText("Denunciar Fulano")).toBeTruthy();
  });

  it("bloqueia o usuário com sucesso e oculta o perfil", async () => {
    blockUser.mockResolvedValueOnce({ success: true });
    
    render(<Discovery />);
    await act(async () => {});
    
    await pressButton("btn-block-mock");
    
    expect(blockUser).toHaveBeenCalledWith(99);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Usuário bloqueado",
      expect.any(String)
    );
    expect(screen.queryByTestId("mock-discovery-card")).toBeNull();
  });
});