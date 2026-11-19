import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import Encontros from "../../src/screens/Encontros";
import { fetchMatches, cancelEncontro } from "../../src/services/match";

jest.mock("../../src/services/match", () => ({
  fetchMatches: jest.fn(),
  cancelEncontro: jest.fn(),
}));
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (p) => React.createElement(Text, p, p.name) };
});

const AGENDADO = {
  id: "sched-3", rawId: "3", tipo: "agendado", name: "Regis", titulo: "Café",
  photo: "https://res.cloudinary.com/x/r.jpg", local: "Centro", dateTime: "18/11/2026, 15:07",
  status: "Agendado", conversationId: 9, googleUrl: "https://calendar.google.com/calendar/render?x=1",
};
const MATCH = {
  id: "match-abc", rawId: "abc", tipo: "match", name: "Ana", titulo: null, photo: null,
  local: "A combinar via chat", dateTime: null, status: "A combinar", conversationId: 5, googleUrl: null,
};

async function renderScreen(nav = { navigate: jest.fn(), addListener: () => () => {} }) {
  render(<Encontros navigation={nav} />);
  await screen.findByTestId("encontros-list");
  return { nav };
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMatches.mockResolvedValue([AGENDADO, MATCH]);
});

describe("Encontros — cards ricos", () => {
  it("mostra status, data/hora, local e botões", async () => {
    await renderScreen();
    expect(screen.getByText("Regis")).toBeTruthy();
    expect(screen.getByText("Agendado")).toBeTruthy();
    expect(screen.getByText("18/11/2026, 15:07")).toBeTruthy();
    expect(screen.getByText("Centro")).toBeTruthy();
    expect(screen.getByTestId("match-chat-sched-3")).toBeTruthy();
    expect(screen.getByTestId("match-google-sched-3")).toBeTruthy();
  });

  it("match sem data não mostra botão do Google Agenda", async () => {
    await renderScreen();
    expect(screen.queryByTestId("match-google-match-abc")).toBeNull();
    expect(screen.getByTestId("match-chat-match-abc")).toBeTruthy();
  });

  it("Abrir Chat navega para a conversa", async () => {
    const { nav } = await renderScreen();
    fireEvent.press(screen.getByTestId("match-chat-sched-3"));
    expect(nav.navigate).toHaveBeenCalledWith("Chat", { conversationId: 9, contact: { name: "Regis", avatar: AGENDADO.photo } });
  });

  it("Google Agenda abre o link", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockImplementation(() => {});
    await renderScreen();
    fireEvent.press(screen.getByTestId("match-google-sched-3"));
    expect(openURL).toHaveBeenCalledWith(AGENDADO.googleUrl);
    openURL.mockRestore();
  });

  it("estado vazio quando não há encontros", async () => {
    fetchMatches.mockResolvedValue([]);
    render(<Encontros navigation={{ navigate: jest.fn(), addListener: () => () => {} }} />);
    expect(await screen.findByTestId("encontros-empty")).toBeTruthy();
  });
});
