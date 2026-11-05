import React from "react";
import { RefreshControl } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import Matches from "../../src/screens/Matches";
import { fetchConversations } from "../../src/services/conversations";

jest.mock("../../src/services/conversations", () => ({
  fetchConversations: jest.fn(),
}));

const CONVERSATIONS = [
  {
    id: 17,
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
});
