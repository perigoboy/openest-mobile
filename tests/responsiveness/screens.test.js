// tests/responsiveness/screens.test.js
// T052 — o app precisa funcionar em telas Android pequenas e grandes, sem
// cortes ou sobreposições. No Jest não existe motor de layout (Yoga), então
// validamos as REGRAS que garantem isso: tamanhos calculados a partir da
// tela, ausência de larguras fixas maiores que a menor tela, quebra de linha
// onde o conteúdo não cabe e textos longos sem estourar.
//
// ⚠️ Isto NÃO substitui o teste manual em aparelho/emulador pedido na T052
// (ver checklist em tests/Anotacoes.md).
import React from "react";
import { StyleSheet } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import useWindowDimensions from "react-native/Libraries/Utilities/useWindowDimensions";
import DiscoveryCard, { CARD_SCREEN_RATIO } from "../../src/components/DiscoveryCard";
import NetworkErrorBanner from "../../src/components/NetworkErrorBanner";
import { ToastProvider } from "../../src/components";
import Chat from "../../src/screens/Chat";
import Matches from "../../src/screens/Matches";
import { __resetNetworkErrorsForTests, enqueueFailedRequest } from "../../src/services/networkErrors";
import { fetchConversations } from "../../src/services/conversations";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 360, height: 640, scale: 2, fontScale: 1 })),
}));

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (props) => React.createElement(Text, props, "icon") };
});
jest.mock("../../src/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
jest.mock("../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
  findConversationContact: jest.fn().mockResolvedValue(null),
}));

let mockChatMessages = [];
jest.mock("../../src/hooks/useChat", () => ({
  useChat: () => ({
    messages: mockChatMessages,
    loading: false,
    error: null,
    connected: true,
    sendMessage: jest.fn(),
    retryMessage: jest.fn(),
    reload: jest.fn(),
  }),
}));

// Tamanhos de tela (dp) — do Android mais compacto a um tablet.
const DEVICES = [
  ["Android pequeno (320x568)", { width: 320, height: 568 }],
  ["Android médio (360x640)", { width: 360, height: 640 }],
  ["Android grande (412x915)", { width: 412, height: 915 }],
  ["Tablet (800x1280)", { width: 800, height: 1280 }],
];
const SMALLEST_WIDTH = 320;

function useDevice({ width, height }, fontScale = 1) {
  useWindowDimensions.mockReturnValue({ width, height, scale: 2, fontScale });
}

const LONG_NAME = "Maria Eduarda de Albuquerque Cavalcanti Sobrinho";
const LONG_TEXT = "Esta é uma mensagem bem longa ".repeat(20);

describe.each(DEVICES)("%s", (_, device) => {
  beforeEach(() => useDevice(device));

  it("cartão da Descoberta nunca passa de 80% da altura da tela", () => {
    render(
      <DiscoveryCard
        profile={{ id: "1", name: LONG_NAME, age: 30, kind: "single", kindLabel: null, photo: "https://x/y.jpg", bio: LONG_TEXT }}
      />
    );
    const style = StyleSheet.flatten(screen.getByTestId("discovery-card").props.style);

    expect(style.maxHeight).toBe(Math.round(device.height * CARD_SCREEN_RATIO));
    expect(style.maxHeight).toBeLessThan(device.height);
    expect(style.flex).toBe(1);
  });

  it("imagens do chat se ajustam à largura (sem estourar a bolha)", () => {
    mockChatMessages = [
      { id: "1", text: "https://res.cloudinary.com/x/foto.jpg", time: "10:00", isMine: false, isImage: true, status: "sent" },
    ];
    render(<ToastProvider><Chat navigation={{ navigate: jest.fn() }} route={{ params: { conversationId: 1, contact: { id: "u", name: "Ana" } } }} /></ToastProvider>);

    const image = screen.getByLabelText("Imagem enviada na conversa");
    const { width } = StyleSheet.flatten(image.props.style);
    // A bolha tem maxWidth de 82% e padding: a imagem precisa caber nela.
    expect(width).toBeLessThanOrEqual(device.width * 0.6);
    expect(width).toBeLessThanOrEqual(240);
  });

  it("nome longo no cabeçalho do chat fica em uma linha (com reticências)", () => {
    mockChatMessages = [];
    render(<ToastProvider><Chat navigation={{ navigate: jest.fn() }} route={{ params: { conversationId: 1, contact: { id: "u", name: LONG_NAME } } }} /></ToastProvider>);

    const title = screen.getByText(LONG_NAME);
    expect(title.props.numberOfLines).toBe(1);
  });
});

describe("regras de layout independentes do aparelho", () => {
  beforeEach(() => useDevice(DEVICES[0][1]));

  it("lista de conversas: nome e última mensagem não quebram o layout", async () => {
    fetchConversations.mockResolvedValue([
      { id: 1, name: LONG_NAME, img: "", timestamp: "Agora", lastMessage: LONG_TEXT },
    ]);
    render(<Matches navigation={{ navigate: jest.fn() }} />);

    expect((await screen.findByText(LONG_NAME)).props.numberOfLines).toBe(1);
    expect(screen.getByText(LONG_TEXT).props.numberOfLines).toBe(1);
  });

  it("banner de erro de rede quebra em duas linhas quando não cabe (tela pequena)", () => {
    __resetNetworkErrorsForTests();
    render(<NetworkErrorBanner />);
    act(() => {
      enqueueFailedRequest({ kind: "offline", error: new Error("x"), retry: jest.fn() }).catch(() => {});
    });

    const message = screen.getByTestId("network-error-message");
    let row = message.parent;
    while (row && typeof row.type !== "string") row = row.parent;
    const rowStyle = StyleSheet.flatten(row.props.style);
    expect(rowStyle.flexWrap).toBe("wrap");
    expect(StyleSheet.flatten(message.props.style).flex).toBe(1);
  });

  it("nenhuma largura fixa maior que a menor tela suportada", () => {
    const fs = require("fs");
    const path = require("path");
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
      );
    const offenders = [];
    walk(path.join(__dirname, "../../src"))
      .filter((f) => f.endsWith(".js"))
      .forEach((file) => {
        const src = fs.readFileSync(file, "utf8");
        for (const m of src.matchAll(/\b(width|minWidth):\s*(\d+)/g)) {
          // Margem para padding lateral (2 × 16dp) da menor tela.
          if (Number(m[2]) > SMALLEST_WIDTH - 32) offenders.push(`${path.basename(file)} → ${m[0]}`);
        }
      });
    expect(offenders).toEqual([]);
  });

  it("o app não bloqueia o aumento de fonte do sistema (acessibilidade)", () => {
    const fs = require("fs");
    const path = require("path");
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
      );
    const offenders = walk(path.join(__dirname, "../../src"))
      .filter((f) => f.endsWith(".js"))
      .filter((f) => /allowFontScaling=\{false\}/.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
