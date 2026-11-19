// tests/components/GifPickerModal.test.js
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import GifPickerModal from "../../src/components/GifPickerModal";
import { searchGifs } from "../../src/services/giphy";

jest.mock("../../src/services/giphy", () => ({ searchGifs: jest.fn() }));
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (props) => React.createElement(Text, props, props.name) };
});

const GIFS = [
  { id: "a", url: "https://giphy/a.gif", preview: "https://giphy/a-sm.gif" },
  { id: "b", url: "https://giphy/b.gif", preview: "https://giphy/b-sm.gif" },
];

beforeEach(() => {
  jest.clearAllMocks();
  searchGifs.mockResolvedValue(GIFS);
});

describe("GifPickerModal", () => {
  it("carrega GIFs ao abrir (após o debounce) e envia o escolhido", async () => {
    jest.useFakeTimers();
    const onSelect = jest.fn();
    render(<GifPickerModal visible onClose={jest.fn()} onSelect={onSelect} />);

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    jest.useRealTimers();

    await waitFor(() => expect(screen.getByTestId("gif-a")).toBeTruthy());
    fireEvent.press(screen.getByTestId("gif-a"));
    expect(onSelect).toHaveBeenCalledWith("https://giphy/a.gif");
  });

  it("busca pelo termo digitado", async () => {
    jest.useFakeTimers();
    render(<GifPickerModal visible onClose={jest.fn()} onSelect={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId("gif-search"), "gato");
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    jest.useRealTimers();
    expect(searchGifs).toHaveBeenCalledWith("gato");
  });

  it("botão fechar aciona onClose", () => {
    const onClose = jest.fn();
    render(<GifPickerModal visible onClose={onClose} onSelect={jest.fn()} />);
    fireEvent.press(screen.getByTestId("gif-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("mostra erro quando a busca falha", async () => {
    searchGifs.mockRejectedValue(new Error("rede"));
    jest.useFakeTimers();
    render(<GifPickerModal visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    jest.useRealTimers();
    await waitFor(() => expect(screen.getByTestId("gif-error")).toBeTruthy());
  });
});
