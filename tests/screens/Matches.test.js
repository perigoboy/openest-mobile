import React from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import Matches, { conversationPreview, formatListTime } from "../../src/screens/Matches";
import { unmatch } from "../../src/services/match";
import { Alert } from "react-native";
import { fetchConversations } from "../../src/services/conversations";

jest.mock("../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
}));
jest.mock("../../src/services/match", () => ({ unmatch: jest.fn().mockResolvedValue({}) }));

// T045 — socket falso: permite disparar `new_match` / `notification`.
jest.mock("../../src/services/socket", () => {
  const handlers = {};
  return {
    SOCKET_EVENTS: { NEW_MATCH: "new_match", NOTIFICATION: "notification" },
    onSocketEvent: jest.fn((event, handler) => {
      handlers[event] = handler;
      return () => {
        if (handlers[event] === handler) delete handlers[event];
      };
    }),
    __fire: (event, payload) => handlers[event] && handlers[event](payload),
    __handlers: handlers,
  };
});
const socketMock = require("../../src/services/socket");

const CONVERSATIONS = [
  {
    id: 17,
    other_user_id: "user-ana",
    name: "Ana Lima",
    img: "https://example.com/ana.jpg",
    timestamp: "Agora",
    lastMessage: "Oi, tudo bem?",
  },
  {
    id: 18,
    name: "Bruno Alves",
    img: "",
    timestamp: "Ontem",
    lastMessage: "Até mais!",
  },
];

async function renderMatches(navigation = { navigate: jest.fn() }) {
  fetchConversations.mockResolvedValue(CONVERSATIONS);
  render(<Matches navigation={navigation} />);
  await screen.findByText("Ana Lima");
  return { navigation };
}

describe("Matches", () => {
  beforeEach(() => {
    fetchConversations.mockReset();
  });

  it("loads and renders conversations from the API", async () => {
    await renderMatches();

    expect(fetchConversations).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Oi, tudo bem?")).toBeTruthy();
    expect(screen.getByText("Bruno Alves")).toBeTruthy();
    expect(screen.getByText("Ontem")).toBeTruthy();
  });

  it("opens the selected conversation with its ID and contact details", async () => {
    const { navigation } = await renderMatches();

    fireEvent.press(screen.getByTestId("conversation-17"));

    expect(navigation.navigate).toHaveBeenCalledWith("Chat", {
      conversationId: 17,
      contact: {
        id: "user-ana",
        name: "Ana Lima",
        avatar: "https://example.com/ana.jpg",
      },
    });
  });

  it("reloads conversations when pulled to refresh", async () => {
    await renderMatches();
    const refreshControl = screen.UNSAFE_getByType(RefreshControl);

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(fetchConversations).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state when the API returns no conversations", async () => {
    fetchConversations.mockResolvedValue([]);
    render(<Matches navigation={{ navigate: jest.fn() }} />);

    expect(await screen.findByTestId("conversations-empty")).toBeTruthy();
  });

  it("empty state CTA is styled (visible on the dark background) and opens Discovery", async () => {
    fetchConversations.mockResolvedValue([]);
    const navigation = { navigate: jest.fn() };
    render(<Matches navigation={navigation} />);

    const cta = await screen.findByTestId("btn-go-to-discovery");
    const ctaStyle = StyleSheet.flatten(cta.props.style);
    expect(ctaStyle.backgroundColor).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText("Descobrir perfis").props.style).color).toBe("#FFFFFF");

    fireEvent.press(cta);
    expect(navigation.navigate).toHaveBeenCalledWith("Discovery");
  });

  it("T045: reloads the list in real time on a new match or a new message", async () => {
    await renderMatches();
    expect(fetchConversations).toHaveBeenCalledTimes(1);

    await act(async () => {
      socketMock.__fire("new_match", { conversation_id: 99 });
    });
    await act(async () => {
      socketMock.__fire("notification", { conversation_id: 17 });
    });

    expect(fetchConversations).toHaveBeenCalledTimes(3);
  });

  it("stops listening to the socket when unmounted", async () => {
    fetchConversations.mockResolvedValue(CONVERSATIONS);
    const { unmount } = render(<Matches navigation={{ navigate: jest.fn() }} />);
    await screen.findByText("Ana Lima");

    unmount();
    expect(socketMock.__handlers.new_match).toBeUndefined();
    expect(socketMock.__handlers.notification).toBeUndefined();
  });

  it("ações no TOQUE LONGO (padrão WhatsApp): desfazer match pede confirmação", async () => {
    await renderMatches();
    // Linhas limpas: nenhum botão "⋮" por conversa.
    expect(screen.queryByTestId("conversation-options-17")).toBeNull();

    fireEvent(screen.getByTestId("conversation-17"), "longPress");
    expect(screen.getByTestId("conversation-action-unmatch")).toBeTruthy();
    fireEvent.press(screen.getByTestId("conversation-action-unmatch"));

    const [titulo, , botoes] = Alert.alert.mock.calls.at(-1);
    expect(titulo).toBe("Desfazer match");
    await act(async () => {
      await botoes.find((b) => b.text === "Desfazer").onPress();
    });
    expect(unmatch).toHaveBeenCalledWith(17);
    expect(screen.queryByText("Ana Lima")).toBeNull();
  });

  it("busca filtra pelo nome (sem diferenciar acentos/maiúsculas)", async () => {
    await renderMatches();
    fireEvent.changeText(screen.getByTestId("conversations-search"), "ANA");
    expect(screen.getByText("Ana Lima")).toBeTruthy();
    expect(screen.queryByText("Bruno Alves")).toBeNull();

    fireEvent.changeText(screen.getByTestId("conversations-search"), "zzz");
    expect(screen.getByTestId("conversations-search-empty")).toBeTruthy();

    fireEvent.press(screen.getByTestId("conversations-search-clear"));
    expect(screen.getByText("Bruno Alves")).toBeTruthy();
  });

  it("mostra badge de não lidas, ticks e prévia tipada da API nova", async () => {
    fetchConversations.mockResolvedValue([
      {
        id: 30, name: "Carla", img: null, unreadCount: 3,
        timestamp: new Date().toISOString(),
        last_message: { type: "image", preview: "Foto", is_mine: false, status: "delivered" },
      },
      {
        id: 31, name: "Davi", img: null, unreadCount: 0,
        timestamp: new Date().toISOString(),
        last_message: { type: "text", preview: "combinado", is_mine: true, status: "read" },
      },
    ]);
    render(<Matches navigation={{ navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />);
    await screen.findByText("Carla");

    expect(screen.getByTestId("conversation-unread-30")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByTestId("conversation-unread-31")).toBeNull();
    expect(screen.getByText("Foto")).toBeTruthy();
    // A última é minha e foi lida: checks azuis na própria lista.
    expect(screen.getByLabelText("Visualizada")).toBeTruthy();
  });
});

describe("formatListTime", () => {
  const agora = new Date(2026, 10, 19, 18, 0);
  it("hoje mostra a hora; ontem mostra 'Ontem'", () => {
    expect(formatListTime(new Date(2026, 10, 19, 9, 5).toISOString(), agora)).toBe("09:05");
    expect(formatListTime(new Date(2026, 10, 18, 22, 0).toISOString(), agora)).toBe("Ontem");
  });
  it("mais antigo mostra a data; rótulo antigo passa direto", () => {
    expect(formatListTime(new Date(2026, 9, 1).toISOString(), agora)).toBe("01/10/26");
    expect(formatListTime("Agora", agora)).toBe("Agora");
    expect(formatListTime(null, agora)).toBe("");
  });
});

describe("conversationPreview", () => {
  it("usa o tipo da API para escolher o ícone", () => {
    expect(conversationPreview({ last_message: { type: "location", preview: "Localização" } }).icon).toBe("location-outline");
    expect(conversationPreview({ last_message: { type: "invite", preview: "Convite de encontro" } }).icon).toBe("calendar-outline");
    expect(conversationPreview({ last_message: { type: "view_once", preview: "Foto", is_opened: true } }).icon).toBe("eye-off-outline");
  });
  it("sem mensagens convida a dizer oi", () => {
    expect(conversationPreview({ lastMessage: null })).toMatchObject({ text: "Novo match · diga oi", isNew: true });
  });
  it("texto bruto antigo é classificado (foto/convite)", () => {
    expect(conversationPreview({ lastMessage: "https://res.cloudinary.com/x/a.jpg" }).text).toBe("Foto");
    expect(conversationPreview({ lastMessage: '[CONVITE_EVENTO]{"titulo":"x"}' }).text).toBe("Convite de encontro");
  });
});
