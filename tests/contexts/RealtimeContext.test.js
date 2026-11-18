// tests/contexts/RealtimeContext.test.js
// T045 — socket acompanha o login · T048 — eventos viram notificação local.
import React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { RealtimeProvider, handleRealtimeEvent, isMockToken, useRealtime } from "../../src/contexts/RealtimeContext";
import { __mockSocket as socket, connectSocket, disconnectSocket } from "../../src/services/socket";
import {
  areNotificationsEnabled,
  registerForPushNotificationsAsync,
} from "../../src/services/notifications";
import { showInAppNotification } from "../../src/services/inAppNotifications";
import { clearActiveConversation, setActiveConversation } from "../../src/services/activeConversation";

let mockAuth = { signed: true, user: { id: "me" } };
jest.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("../../src/services/socket", () => {
  const handlers = {};
  const fake = {
    connected: false,
    handlers,
    on: jest.fn((event, fn) => {
      (handlers[event] = handlers[event] || new Set()).add(fn);
    }),
    off: jest.fn((event, fn) => handlers[event] && handlers[event].delete(fn)),
    fire(event, payload) {
      (handlers[event] || new Set()).forEach((fn) => fn(payload));
    },
  };
  return {
    SOCKET_EVENTS: { NOTIFICATION: "notification", NEW_MATCH: "new_match" },
    connectSocket: jest.fn(),
    disconnectSocket: jest.fn(),
    getSocket: () => fake,
    __mockSocket: fake,
  };
});

jest.mock("../../src/services/notifications", () => ({
  areNotificationsEnabled: jest.fn(),
  registerForPushNotificationsAsync: jest.fn(),
  buildInAppNotificationFromSocket: jest.requireActual("../../src/services/notifications").buildInAppNotificationFromSocket,
}));
jest.mock("../../src/services/inAppNotifications", () => ({
  showInAppNotification: jest.fn(() => "inapp-1"),
}));

function Status() {
  const { connected } = useRealtime();
  return <Text testID="status">{connected ? "online" : "offline"}</Text>;
}

function renderProvider() {
  return render(
    <RealtimeProvider>
      <Status />
    </RealtimeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(socket.handlers).forEach((k) => delete socket.handlers[k]);
  clearActiveConversation();
  mockAuth = { signed: true, user: { id: "me" } };
  SecureStore.getItemAsync.mockResolvedValue("jwt-real");
  areNotificationsEnabled.mockResolvedValue(true);
  registerForPushNotificationsAsync.mockResolvedValue(null);
});

describe("RealtimeProvider — conexão", () => {
  it("após o login conecta o socket com o JWT e registra o push", async () => {
    renderProvider();

    await waitFor(() => expect(connectSocket).toHaveBeenCalledWith("jwt-real"));
    expect(registerForPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it("login de desenvolvimento (token mock) não abre socket", async () => {
    SecureStore.getItemAsync.mockResolvedValue("mock-token-admin-123");
    renderProvider();

    await act(async () => {});
    expect(connectSocket).not.toHaveBeenCalled();
    expect(registerForPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("deslogado: desconecta o socket", async () => {
    mockAuth = { signed: false, user: null };
    renderProvider();

    await act(async () => {});
    expect(disconnectSocket).toHaveBeenCalled();
    expect(connectSocket).not.toHaveBeenCalled();
  });

  it("expõe o status da conexão", async () => {
    renderProvider();
    expect(screen.getByTestId("status").props.children).toBe("offline");

    act(() => socket.fire("connect"));
    expect(screen.getByTestId("status").props.children).toBe("online");

    act(() => socket.fire("disconnect"));
    expect(screen.getByTestId("status").props.children).toBe("offline");
  });

  it("falha de autenticação do socket não derruba o app", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderProvider();

    act(() => socket.fire("connect_error", new Error("Erro de autenticação")));
    expect(screen.getByTestId("status").props.children).toBe("offline");
    warn.mockRestore();
  });

  it("remove os listeners ao desmontar", async () => {
    const { unmount } = renderProvider();
    await act(async () => {});
    unmount();
    expect(socket.handlers.notification.size).toBe(0);
    expect(socket.handlers.new_match.size).toBe(0);
  });
});

describe("RealtimeProvider — eventos viram banner in-app (sem push remoto)", () => {
  it("nova mensagem mostra o banner com nome, prévia e foto", async () => {
    renderProvider();
    await waitFor(() => expect(registerForPushNotificationsAsync).toHaveBeenCalled());

    await act(async () => {
      socket.fire("notification", {
        type: "message",
        sender_name: "Ana",
        sender_avatar: "https://res.cloudinary.com/x/ana.jpg",
        content: "Oi!",
        conversation_id: 42,
        sender_id: "u-ana",
      });
    });

    expect(showInAppNotification).toHaveBeenCalledWith({
      type: "message",
      name: "Ana",
      message: "Oi!",
      avatar: "https://res.cloudinary.com/x/ana.jpg",
      conversationId: 42,
      userId: "u-ana",
    });
  });

  it("novo match mostra o banner de match", async () => {
    renderProvider();
    await waitFor(() => expect(registerForPushNotificationsAsync).toHaveBeenCalled());

    await act(async () => {
      socket.fire("new_match", { conversation_id: 9, match_id: "m1", other_user_name: "Bruno", user_id: "u-bruno" });
    });

    expect(showInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "match", name: "Bruno", conversationId: 9, userId: "u-bruno" })
    );
  });

  it("com push remoto ativo não duplica (o backend já notifica)", async () => {
    registerForPushNotificationsAsync.mockResolvedValue("ExponentPushToken[x]");
    renderProvider();
    await waitFor(() => expect(registerForPushNotificationsAsync).toHaveBeenCalled());
    await act(async () => {});

    await act(async () => {
      socket.fire("notification", { sender_name: "Ana", content: "Oi!", conversation_id: 42 });
    });

    expect(showInAppNotification).not.toHaveBeenCalled();
  });
});

describe("handleRealtimeEvent", () => {
  it("não notifica a conversa que está aberta", async () => {
    setActiveConversation(42);
    await expect(handleRealtimeEvent("notification", { conversation_id: 42 }, { pushRegistered: false })).resolves.toBe(false);
    expect(showInAppNotification).not.toHaveBeenCalled();
  });

  it("respeita as notificações desligadas", async () => {
    areNotificationsEnabled.mockResolvedValue(false);
    await expect(handleRealtimeEvent("new_match", {}, { pushRegistered: false })).resolves.toBe(false);
    expect(showInAppNotification).not.toHaveBeenCalled();
  });

  it("isMockToken reconhece só o token de desenvolvimento", () => {
    expect(isMockToken("mock-token-admin-123")).toBe(true);
    expect(isMockToken("eyJhbGciOi...")).toBe(false);
    expect(isMockToken(null)).toBe(false);
  });
});
