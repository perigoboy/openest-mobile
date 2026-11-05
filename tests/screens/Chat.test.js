import React from "react";
import { FlatList, KeyboardAvoidingView } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Chat from "../../src/screens/Chat";

function renderChat(overrides = {}) {
  const navigation = {
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
  render(<Chat navigation={navigation} {...overrides} />);
  return { navigation };
}

describe("Chat", () => {
  it("renders the contact and the conversation in an inverted list", () => {
    renderChat({ route: { params: { contact: { name: "Ana Lima" } } } });

    expect(screen.getByText("Ana Lima")).toBeTruthy();
    expect(screen.getByText("Oi! Tudo bem?")).toBeTruthy();
    expect(screen.getByTestId("chat-message-list").props.inverted).toBe(true);
    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("keeps the composer inside a keyboard avoiding view", () => {
    renderChat();

    expect(screen.getByTestId("chat-keyboard-avoiding-view")).toBeTruthy();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    expect(screen.getByTestId("chat-message-input")).toBeTruthy();
  });

  it("adds a non-empty message to the conversation and clears the input", () => {
    renderChat();
    const input = screen.getByTestId("chat-message-input");

    fireEvent.changeText(input, "  Até mais!  ");
    fireEvent.press(screen.getByTestId("chat-send-button"));

    expect(screen.getByText("Até mais!")).toBeTruthy();
    expect(screen.getByTestId("chat-message-input").props.value).toBe("");
  });

  it("does not send an empty or whitespace-only message", () => {
    renderChat();

    fireEvent.changeText(screen.getByTestId("chat-message-input"), "   ");
    fireEvent.press(screen.getByTestId("chat-send-button"));

    expect(screen.queryByText("   ")).toBeNull();
    expect(
      screen.getByTestId("chat-send-button").props.accessibilityState.disabled
    ).toBe(true);
  });

  it("returns to the conversations list instead of the navigator's previous tab", () => {
    const { navigation } = renderChat();

    fireEvent.press(screen.getByTestId("chat-back-button"));
    expect(navigation.navigate).toHaveBeenCalledWith("Matches");
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
