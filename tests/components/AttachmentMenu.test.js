// tests/components/AttachmentMenu.test.js
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import AttachmentMenu from "../../src/components/AttachmentMenu";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (props) => React.createElement(Text, props, props.name) };
});

describe("AttachmentMenu", () => {
  it("mostra as 3 ações (Foto, Localização, GIF)", () => {
    render(<AttachmentMenu visible onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByTestId("attachment-photo")).toBeTruthy();
    expect(screen.getByTestId("attachment-location")).toBeTruthy();
    expect(screen.getByTestId("attachment-gif")).toBeTruthy();
  });

  it("devolve a opção escolhida", () => {
    const onSelect = jest.fn();
    render(<AttachmentMenu visible onClose={jest.fn()} onSelect={onSelect} />);
    fireEvent.press(screen.getByTestId("attachment-location"));
    expect(onSelect).toHaveBeenCalledWith("location");
  });

  it("fecha ao tocar fora", () => {
    const onClose = jest.fn();
    render(<AttachmentMenu visible onClose={onClose} onSelect={jest.fn()} />);
    fireEvent.press(screen.getByTestId("attachment-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
