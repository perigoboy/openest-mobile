// tests/components/NetworkErrorBanner.test.js — T050
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import NetworkErrorBanner from "../../src/components/NetworkErrorBanner";
import {
  __resetNetworkErrorsForTests,
  enqueueFailedRequest,
  hasNetworkErrorHandler,
} from "../../src/services/networkErrors";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (props) => React.createElement(Text, props, props.name) };
});

beforeEach(() => __resetNetworkErrorsForTests());

describe("NetworkErrorBanner", () => {
  it("fica escondido quando não há falha de rede", () => {
    render(<NetworkErrorBanner />);
    expect(screen.queryByTestId("network-error-banner")).toBeNull();
  });

  it("se registra como tratador global ao montar e sai ao desmontar", () => {
    const { unmount } = render(<NetworkErrorBanner />);
    expect(hasNetworkErrorHandler()).toBe(true);
    unmount();
    expect(hasNetworkErrorHandler()).toBe(false);
  });

  it("mostra a mensagem de offline com ações acessíveis", async () => {
    render(<NetworkErrorBanner />);

    act(() => {
      enqueueFailedRequest({ kind: "offline", error: new Error("x"), retry: jest.fn() }).catch(() => {});
    });

    expect(screen.getByTestId("network-error-banner")).toBeTruthy();
    expect(screen.getByText("Sem conexão com a internet. Verifique sua rede.")).toBeTruthy();
    expect(screen.getByLabelText("Tentar novamente")).toBeTruthy();
    expect(screen.getByLabelText("Fechar aviso de erro de conexão")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("mostra a mensagem de timeout", () => {
    render(<NetworkErrorBanner />);
    act(() => {
      enqueueFailedRequest({ kind: "timeout", error: new Error("x"), retry: jest.fn() }).catch(() => {});
    });
    expect(screen.getByText("O servidor demorou para responder.")).toBeTruthy();
  });

  it("'Tentar novamente' refaz a requisição, entrega o resultado e esconde o aviso", async () => {
    render(<NetworkErrorBanner />);
    const retry = jest.fn().mockResolvedValue("dados");
    let pending;
    act(() => {
      pending = enqueueFailedRequest({ kind: "offline", error: new Error("x"), retry });
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("network-error-retry"));
    });

    await expect(pending).resolves.toBe("dados");
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("network-error-banner")).toBeNull();
  });

  it("'Fechar' rejeita com o erro original e esconde o aviso", async () => {
    render(<NetworkErrorBanner />);
    const original = new Error("Network Error");
    let pending;
    act(() => {
      pending = enqueueFailedRequest({ kind: "offline", error: original, retry: jest.fn() });
    });

    const assertion = expect(pending).rejects.toBe(original);
    await act(async () => {
      fireEvent.press(screen.getByTestId("network-error-dismiss"));
    });

    await assertion;
    expect(screen.queryByTestId("network-error-banner")).toBeNull();
  });
});
