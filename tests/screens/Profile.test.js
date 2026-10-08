// tests/screens/Profile.test.js
//
// Testes automatizados da T026 — Perfil e Privacidade.
//
// Escopo:
//   - T022: Modo Discreto (switch + PATCH /api/users/perfil) — foco principal.
//   - T019: Edição de perfil (handleSave — comportamento atual/stub).
//
// Fora de escopo (não testado aqui): galeria de fotos (T021), upload de
// foto (T020) e verificação por selfie (T023). Ficam para testes futuros.

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import Profile from "../../src/screens/Profile";
import api from "../../src/services/api";

// ---------------------------------------------------------------------------
// Peculiaridade #1 (Anotacoes.md) — TouchableOpacity perde onPress no render
// com Expo SDK 57 + React 19. Este mock restaura o onPress nas props para que
// os cliques possam ser disparados por `el.props.onPress()`.
// ---------------------------------------------------------------------------
jest.mock(
  "react-native/Libraries/Components/Touchable/TouchableOpacity",
  () => {
    const React = require("react");
    const { View } = require("react-native");
    const Mocked = React.forwardRef((props, ref) => {
      const {
        children,
        onPress,
        disabled,
        testID,
        style,
        accessibilityRole,
      } = props;
      return React.createElement(
        View,
        {
          ref,
          testID,
          accessibilityRole: accessibilityRole || "button",
          accessibilityState: { disabled: !!disabled },
          style,
          onPress: disabled ? undefined : onPress,
        },
        children
      );
    });
    Mocked.displayName = "TouchableOpacity";
    return { __esModule: true, default: Mocked, TouchableOpacity: Mocked };
  }
);

// ---------------------------------------------------------------------------
// Mocks de módulos nativos / externos
// ---------------------------------------------------------------------------

// API (Axios instance) — a MESMA instância precisa valer no teste E no
// componente (peculiaridade #2).
jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

// Componentes internos do app (barrel ../../components).
jest.mock("../../src/components", () => ({
  Avatar: () => null,
  PhotoGallery: () => null,
  VerifiedBadge: () => null,
}));

// Serviços auxiliares — não são o alvo dos testes da T026.
jest.mock("../../src/services/uploadPhoto", () => ({
  __esModule: true,
  uploadProfilePhoto: jest.fn(),
  default: jest.fn(),
}));

jest.mock("../../src/services/profilePhotos", () => ({
  MAX_PROFILE_PHOTOS: 6,
  addPhoto: jest.fn((list, url) => [...list, url]),
  movePhoto: jest.fn((list) => list),
  photosFromProfile: jest.fn(() => []),
  persistProfilePhotos: jest.fn(async () => {}),
  removePhoto: jest.fn((list) => list),
  sanitizePhotos: jest.fn((list) => list),
  setMainPhoto: jest.fn((list) => list),
}));

// Módulos nativos usados só no JSX/formatação
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }) =>
      React.createElement(View, props, children),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = (props) => React.createElement(Text, props, "icon");
  return { Ionicons: Icon };
});

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Resposta padrão de GET /api/users/perfil usada na maioria dos testes.
function makeProfile(overrides = {}) {
  return {
    name: "Fulano de Tal",
    email: "fulano@openest.com",
    username: "fulano",
    foto_url: "",
    modo_discreto: false,
    verificado: false,
    ...overrides,
  };
}

// Renderiza o Profile, espera o fetchProfile() do useEffect resolver e
// devolve o resultado do render.
async function renderProfile({ navigation } = {}) {
  const result = render(<Profile navigation={navigation} />);
  // Flush do useEffect/fetchProfile pendente.
  await act(async () => {});
  return result;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Profile — Modo Discreto (T022)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    api.get.mockResolvedValue({ data: makeProfile() });
    api.patch.mockResolvedValue({ data: {} });
  });

  it("renderiza o switch desligado quando a API retorna modo_discreto: false", async () => {
    await renderProfile();

    const sw = screen.getByTestId("switch-modo-discreto");
    expect(sw.props.value).toBe(false);
    expect(
      screen.getByText("Desativado — perfil visível no Discovery")
    ).toBeTruthy();
  });

  it("renderiza o switch ligado quando a API retorna modo_discreto: true", async () => {
    api.get.mockResolvedValue({
      data: makeProfile({ modo_discreto: true }),
    });

    await renderProfile();

    const sw = screen.getByTestId("switch-modo-discreto");
    expect(sw.props.value).toBe(true);
    expect(
      screen.getByText("Ativado — perfil oculto no Discovery")
    ).toBeTruthy();
  });

  it("ativar o switch dispara PATCH /api/users/perfil com { modo_discreto: true }", async () => {
    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith("/api/users/perfil", {
      modo_discreto: true,
    });
  });

  it("ativar exibe Alert com título 'Modo Discreto ativado'", async () => {
    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    const titles = Alert.alert.mock.calls.map((c) => c[0]);
    expect(titles).toContain("Modo Discreto ativado");
  });

  it("usa o texto de impacto devolvido pelo backend no Alert de sucesso", async () => {
    api.patch.mockResolvedValue({
      data: { impacto: "Impacto customizado do backend." },
    });

    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    const [, message] = Alert.alert.mock.calls.find(
      (c) => c[0] === "Modo Discreto ativado"
    );
    expect(message).toBe("Impacto customizado do backend.");
  });

  it("desativar o switch dispara PATCH com { modo_discreto: false }", async () => {
    api.get.mockResolvedValue({
      data: makeProfile({ modo_discreto: true }),
    });
    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", false);
    });

    expect(api.patch).toHaveBeenCalledWith("/api/users/perfil", {
      modo_discreto: false,
    });
    const titles = Alert.alert.mock.calls.map((c) => c[0]);
    expect(titles).toContain("Modo Discreto desativado");
  });

  it("faz rollback do switch se a API falhar", async () => {
    api.patch.mockRejectedValue({
      response: { data: { error: "Backend recusou." } },
    });

    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");
    expect(sw.props.value).toBe(false);

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    // Após o rollback, o switch volta ao valor original.
    const swAfter = screen.getByTestId("switch-modo-discreto");
    expect(swAfter.props.value).toBe(false);
  });

  it("exibe Alert de erro com a mensagem devolvida pelo backend", async () => {
    api.patch.mockRejectedValue({
      response: { data: { error: "Backend recusou." } },
    });

    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    const erroCall = Alert.alert.mock.calls.find((c) => c[0] === "Erro");
    expect(erroCall).toBeTruthy();
    expect(erroCall[1]).toBe("Backend recusou.");
  });

  it("usa mensagem default de erro quando error.response está ausente", async () => {
    api.patch.mockRejectedValue(new Error("network down"));

    await renderProfile();
    const sw = screen.getByTestId("switch-modo-discreto");

    await act(async () => {
      fireEvent(sw, "valueChange", true);
    });

    const erroCall = Alert.alert.mock.calls.find((c) => c[0] === "Erro");
    expect(erroCall[1]).toBe("Não foi possível alterar o Modo Discreto.");
  });

  it("ignora um segundo toggle enquanto savingPrivacy está em andamento", async () => {
    // Primeiro PATCH fica pendente (Promise não-resolvida).
    let resolvePatch;
    api.patch.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePatch = resolve; })
    );

    await renderProfile();

    // Dispara o primeiro toggle. O handler é async, então o `await api.patch`
    // pendura e o savingPrivacy vira true logo antes do await.
    const sw1 = screen.getByTestId("switch-modo-discreto");
    fireEvent(sw1, "valueChange", true);

    // Flush de microtasks pra garantir que savingPrivacy propagou.
    await act(async () => {});

    // Segundo toggle — o early return `if (savingPrivacy) return` deve barrar.
    const sw2 = screen.getByTestId("switch-modo-discreto");
    fireEvent(sw2, "valueChange", false);

    // Só uma chamada de PATCH aconteceu.
    expect(api.patch).toHaveBeenCalledTimes(1);

    // Resolve o PATCH pendente pra fechar limpo.
    await act(async () => {
      resolvePatch({ data: {} });
    });
  });
});

describe("Profile — Edição de perfil (T019)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    api.get.mockResolvedValue({ data: makeProfile() });
  });

  it("exibe Alert 'Sucesso' ao tocar em SALVAR (comportamento atual)", async () => {
    await renderProfile();

    // O botão SALVAR é um TouchableOpacity cujo onPress é handleSave.
    // Ele não tem testID, então a gente localiza pelo texto do filho.
    const salvarText = screen.getByText("SALVAR");
    // Sobe na árvore até o TouchableOpacity mais próximo com onPress.
    let node = salvarText.parent;
    while (node && typeof node.props.onPress !== "function") {
      node = node.parent;
    }

    expect(node).toBeTruthy();
    await act(async () => {
      await node.props.onPress();
    });

    const titles = Alert.alert.mock.calls.map((c) => c[0]);
    expect(titles).toContain("Sucesso");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Sucesso",
      "Dados de perfil actualizados com sucesso!"
    );
  });
});