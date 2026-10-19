// tests/components/DiscoveryCard.test.js
// T029 — cartão da tela de Descoberta: foto (ImageBackground ocupando 80% da
// tela), gradiente escuro na base, nome e idade com excelência visual.

import React from "react";
import { Dimensions } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { LinearGradient } from "expo-linear-gradient";
import DiscoveryCard, { CARD_SCREEN_RATIO, resolveSwipe, SWIPE_VELOCITY_THRESHOLD } from "../../src/components/DiscoveryCard";

// Módulos nativos que não rodam no Jest (mesmos mocks dos testes das telas).
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = (props) => React.createElement(Text, props, "icon");
  return { Ionicons: Icon };
});

const PROFILE = {
  id: "proto-juliana",
  name: "Juliana Ferraz",
  age: 26,
  neighborhood: "Meireles",
  city: "Fortaleza",
  distance: "0,5 quilômetros",
  kind: "single",
  kindLabel: null,
  photo: "https://example.com/juliana.jpg",
};

function renderCard(overrides = {}) {
  const props = { profile: { ...PROFILE, ...overrides } };
  render(<DiscoveryCard {...props} />);
  return props;
}

describe("DiscoveryCard — conteúdo (T029)", () => {
  it("renderiza a foto do perfil no ImageBackground", () => {
    renderCard();
    expect(screen.getByTestId("discovery-card-image").props.source.uri).toBe(PROFILE.photo);
  });

  it("renderiza nome e idade", () => {
    renderCard();
    const name = screen.getByTestId("discovery-name");
    expect(name.props.children.join("")).toBe("Juliana Ferraz, 26");
  });

  it("renderiza localização e distância", () => {
    renderCard();
    expect(screen.getByText("Mora em Meireles, Fortaleza")).toBeTruthy();
    expect(screen.getByText("0,5 quilômetros")).toBeTruthy();
  });

  it("não renderiza nada sem perfil", () => {
    render(<DiscoveryCard profile={null} />);
    expect(screen.queryByTestId("discovery-card")).toBeNull();
  });
});

describe("DiscoveryCard — layout (T029)", () => {
  it("preenche o espaço disponível com no máximo 80% da altura da tela", () => {
    renderCard();
    const expected = Math.round(Dimensions.get("window").height * CARD_SCREEN_RATIO);
    expect(screen.getByTestId("discovery-card")).toHaveStyle({ flex: 1, maxHeight: expected });
  });

  it("tem gradiente escuro na base sobre a foto", () => {
    renderCard();
    const shade = screen.getByTestId("discovery-shade");
    expect(shade.props.colors).toEqual(["transparent", "rgba(0,0,0,0.85)"]);
  });
});

describe("DiscoveryCard — badge de casal/grupo (T029)", () => {
  it("exibe o badge quando o perfil tem kindLabel", () => {
    renderCard({ kindLabel: "Casal" });
    expect(screen.getByText("Casal")).toBeTruthy();
  });

  it("não exibe badge quando o perfil é single", () => {
    renderCard();
    expect(screen.queryByText("Casal")).toBeNull();
  });
});

describe("DiscoveryCard — gesto de swipe (T032)", () => {
  it("resolveSwipe: arraste curto não completa o swipe", () => {
    expect(resolveSwipe(0, 0, 100)).toBeNull();
    expect(resolveSwipe(40, 0, 100)).toBeNull();
    expect(resolveSwipe(-40, 0, 100)).toBeNull();
  });

  it("resolveSwipe: ultrapassar o threshold completa like (direita) ou pass (esquerda)", () => {
    expect(resolveSwipe(100, 0, 100)).toBe("like");
    expect(resolveSwipe(130, 0, 100)).toBe("like");
    expect(resolveSwipe(-100, 0, 100)).toBe("pass");
  });

  it("resolveSwipe: flick rápido completa mesmo com deslocamento curto", () => {
    expect(resolveSwipe(30, SWIPE_VELOCITY_THRESHOLD, 100)).toBe("like");
    expect(resolveSwipe(-30, -SWIPE_VELOCITY_THRESHOLD, 100)).toBe("pass");
  });

  it("resolveSwipe: velocidade contrária ao arraste não completa o swipe", () => {
    expect(resolveSwipe(-30, SWIPE_VELOCITY_THRESHOLD, 100)).toBeNull();
    expect(resolveSwipe(30, -SWIPE_VELOCITY_THRESHOLD, 100)).toBeNull();
  });

  it("renderiza com onSwipe e os selos CURTIR/PASSAR", () => {
    render(<DiscoveryCard profile={PROFILE} onSwipe={jest.fn()} />);
    expect(screen.getByTestId("discovery-card")).toBeTruthy();
    expect(screen.getByTestId("discovery-stamp-like")).toBeTruthy();
    expect(screen.getByTestId("discovery-stamp-pass")).toBeTruthy();
    expect(screen.getByText("CURTIR")).toBeTruthy();
    expect(screen.getByText("PASSAR")).toBeTruthy();
  });
});
