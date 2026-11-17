import React from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import Matches from "../../src/screens/Matches";
import { fetchConversations } from "../../src/services/conversations";

jest.mock("../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
}));

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

  it("keeps the options button on the same row as the conversation", async () => {
    await renderMatches();
    // Sobe na árvore a partir do botão "⋮" até a View host em linha.
    let node = screen.getByTestId("conversation-options-17").parent;
    while (
      node &&
      !(typeof node.type === "string" && StyleSheet.flatten(node.props.style)?.flexDirection === "row")
    ) {
      node = node.parent;
    }
    expect(node).toBeTruthy();
    expect(within(node).getByTestId("conversation-17")).toBeTruthy();
  });
});
