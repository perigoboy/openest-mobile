// tests/components/InAppNotificationBanner.test.js — Front-1 (banner estilo Instagram)
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import InAppNotificationBanner, { AUTO_DISMISS_MS } from "../../src/components/InAppNotificationBanner";
import { __resetInAppForTests, showInAppNotification } from "../../src/services/inAppNotifications";
import { navigateToChat } from "../../src/routes/navigationRef";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (props) => React.createElement(Text, props, props.name) };
});
jest.mock("../../src/routes/navigationRef", () => ({ navigateToChat: jest.fn() }));

beforeEach(() => {
  __resetInAppForTests();
  jest.clearAllMocks();
});

function emit(notification) {
  act(() => {
    showInAppNotification(notification);
  });
}

const MSG = {
  type: "message",
  name: "Ana Lima",
  message: "Oi, tudo bem?",
  avatar: "https://res.cloudinary.com/x/ana.jpg",
  conversationId: 42,
  userId: "u-ana",
};

describe("InAppNotificationBanner", () => {
  it("começa oculto (nada aparece sem evento)", () => {
    render(<InAppNotificationBanner />);
    expect(screen.queryByTestId("in-app-notification")).toBeNull();
  });

  it("aparece com nome e prévia quando chega uma mensagem", () => {
    render(<InAppNotificationBanner />);
    emit(MSG);
    expect(screen.getByTestId("in-app-notification")).toBeTruthy();
    expect(screen.getByText("Ana Lima")).toBeTruthy();
    expect(screen.getByText("Oi, tudo bem?")).toBeTruthy();
  });

  it("ao tocar, abre o chat daquela pessoa", () => {
    render(<InAppNotificationBanner />);
    emit(MSG);
    fireEvent.press(screen.getByTestId("in-app-notification"));
    expect(navigateToChat).toHaveBeenCalledWith(42, { id: "u-ana", name: "Ana Lima", avatar: "https://res.cloudinary.com/x/ana.jpg" });
  });

  it("fecha sozinho depois de 4 segundos", () => {
    jest.useFakeTimers();
    try {
      render(<InAppNotificationBanner />);
      emit(MSG);
      expect(screen.getByTestId("in-app-notification")).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(AUTO_DISMISS_MS + 300);
      });
      expect(screen.queryByTestId("in-app-notification")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("uma nova notificação substitui a anterior (um por vez)", () => {
    render(<InAppNotificationBanner />);
    emit(MSG);
    emit({ ...MSG, name: "Bruno", message: "Bora?", conversationId: 7 });
    expect(screen.queryByText("Ana Lima")).toBeNull();
    expect(screen.getByText("Bruno")).toBeTruthy();
  });

  it("match mostra o selo de coração e abre a conversa ao tocar", () => {
    render(<InAppNotificationBanner />);
    emit({ type: "match", name: "Bruno", message: "Vocês deram match! Diga oi 💜", avatar: null, conversationId: 9, userId: "u-b" });
    fireEvent.press(screen.getByTestId("in-app-notification"));
    expect(navigateToChat).toHaveBeenCalledWith(9, { id: "u-b", name: "Bruno", avatar: null });
  });
});
