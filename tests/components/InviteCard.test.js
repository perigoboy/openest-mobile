// tests/components/InviteCard.test.js
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import InviteCard from "../../src/components/InviteCard";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (p) => React.createElement(Text, p, p.name) };
});

const INVITE = { titulo: "Café no centro", local: "Praça do Ferreira", scheduled_at: "2026-11-18T15:07:00", nota: "traga guarda-chuva" };

describe("InviteCard", () => {
  it("recebido: mostra título, local, data e botões Aceitar/Recusar", () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();
    render(<InviteCard invite={INVITE} isMine={false} onAccept={onAccept} onReject={onReject} />);

    expect(screen.getByText("Café no centro")).toBeTruthy();
    expect(screen.getByText("Praça do Ferreira")).toBeTruthy();
    expect(screen.getByText(/18\/11\/2026/)).toBeTruthy();

    fireEvent.press(screen.getByTestId("invite-accept"));
    expect(onAccept).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("invite-reject"));
    expect(onReject).toHaveBeenCalled();
  });

  it("enviado por mim: mostra 'Aguardando resposta…' sem botões", () => {
    render(<InviteCard invite={INVITE} isMine onAccept={jest.fn()} onReject={jest.fn()} />);
    expect(screen.getByTestId("invite-waiting")).toBeTruthy();
    expect(screen.queryByTestId("invite-accept")).toBeNull();
  });
});
