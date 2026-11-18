// tests/routes/linking.test.js
// T049 — Deep Linking a partir das notificações.
// Critério de aceite: "Tocar na notificação de mensagem abre o app já na
// conversa correta" — verificado com um NavigationContainer REAL.
import React from "react";
import { Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { NavigationContainer, getStateFromPath } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import linking, {
  LINKING_SCREENS,
  getUrlFromNotificationData,
  getUrlFromNotificationResponse,
} from "../../src/routes/linking";

jest.mock("expo-linking", () => {
  const listeners = new Set();
  return {
    createURL: jest.fn((path) => `openest://${String(path).replace(/^\//, "")}`),
    getInitialURL: jest.fn().mockResolvedValue(null),
    addEventListener: jest.fn((event, cb) => {
      listeners.add(cb);
      return { remove: jest.fn(() => listeners.delete(cb)) };
    }),
    __emitUrl: (url) => listeners.forEach((cb) => cb({ url })),
    __listeners: listeners,
  };
});

jest.mock("expo-notifications", () => {
  const listeners = new Set();
  return {
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponse: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((cb) => {
      listeners.add(cb);
      return { remove: jest.fn(() => listeners.delete(cb)) };
    }),
    __tap: (response) => listeners.forEach((cb) => cb(response)),
    __listeners: listeners,
  };
});

const responseFor = (data) => ({ notification: { request: { content: { data } } } });

beforeEach(() => {
  jest.clearAllMocks();
  Notifications.getLastNotificationResponse.mockReturnValue(null);
  Linking.getInitialURL.mockResolvedValue(null);
});

describe("URL a partir do payload da notificação", () => {
  it("mensagem abre a conversa", () => {
    expect(getUrlFromNotificationData({ type: "message", conversationId: "42" })).toBe("openest://chat/42");
    expect(getUrlFromNotificationData({ conversation_id: 7 })).toBe("openest://chat/7");
  });

  it("match com conversa abre a conversa; sem conversa abre a lista", () => {
    expect(getUrlFromNotificationData({ type: "match", conversationId: "9" })).toBe("openest://chat/9");
    expect(getUrlFromNotificationData({ type: "match" })).toBe("openest://conversas");
  });

  it("payload desconhecido não navega", () => {
    expect(getUrlFromNotificationData({})).toBeNull();
    expect(getUrlFromNotificationData(null)).toBeNull();
    expect(getUrlFromNotificationData("lixo")).toBeNull();
    expect(getUrlFromNotificationResponse(undefined)).toBeNull();
  });

  it("escapa o id na URL", () => {
    expect(getUrlFromNotificationData({ conversationId: "a/b" })).toBe("openest://chat/a%2Fb");
  });
});

describe("config de rotas", () => {
  it("usa o esquema openest:// (igual ao app.json)", () => {
    expect(linking.prefixes).toContain("openest://");
    expect(require("../../app.json").expo.scheme).toBe("openest");
  });

  it("chat/:conversationId resolve para a tela Chat com o id", () => {
    const state = getStateFromPath("chat/42", linking.config);
    expect(state.routes[0]).toMatchObject({ name: "Chat", params: { conversationId: "42" } });
  });

  it("todas as telas do linking existem nos navegadores", () => {
    const app = require("fs").readFileSync(require("path").join(__dirname, "../../src/routes/AppRoutes.js"), "utf8");
    const auth = require("fs").readFileSync(require("path").join(__dirname, "../../src/routes/AuthRoutes.js"), "utf8");
    Object.keys(LINKING_SCREENS).forEach((name) => {
      expect(app.includes(`name="${name}"`) || auth.includes(`name="${name}"`)).toBe(true);
    });
  });
});

describe("getInitialURL (app aberto do zero pela notificação)", () => {
  it("prioriza a notificação tocada e limpa a resposta (não reabre o chat no próximo boot)", async () => {
    Notifications.getLastNotificationResponse.mockReturnValue(responseFor({ type: "message", conversationId: "42" }));
    Linking.getInitialURL.mockResolvedValue("exp://192.168.0.5:8081");

    await expect(linking.getInitialURL()).resolves.toBe("openest://chat/42");
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it("sem notificação, usa a URL normal de abertura", async () => {
    Linking.getInitialURL.mockResolvedValue("openest://conversas");
    await expect(linking.getInitialURL()).resolves.toBe("openest://conversas");
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
  });
});

describe("subscribe (app aberto ou em segundo plano)", () => {
  it("encaminha links e toques em notificação; para de ouvir ao cancelar", () => {
    const listener = jest.fn();
    const unsubscribe = linking.subscribe(listener);

    Linking.__emitUrl("openest://perfil");
    Notifications.__tap(responseFor({ type: "message", conversationId: "5" }));
    Notifications.__tap(responseFor({ foo: "bar" })); // payload sem destino

    expect(listener.mock.calls).toEqual([["openest://perfil"], ["openest://chat/5"]]);

    unsubscribe();
    expect(Linking.__listeners.size).toBe(0);
    expect(Notifications.__listeners.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integração com o React Navigation de verdade
// ---------------------------------------------------------------------------
const Tab = createBottomTabNavigator();

function MatchesScreen() {
  return <Text>Lista de conversas</Text>;
}

function ChatScreen({ route }) {
  return <Text testID="chat-screen">Conversa {route.params?.conversationId}</Text>;
}

function TestApp() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator initialRouteName="Matches" screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Matches" component={MatchesScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

describe("integração: tocar na notificação abre a conversa correta", () => {
  it("com o app aberto", async () => {
    render(<TestApp />);
    expect(await screen.findByText("Lista de conversas")).toBeTruthy();

    await act(async () => {
      Notifications.__tap(responseFor({ type: "message", conversationId: "42" }));
    });

    expect(await screen.findByText("Conversa 42")).toBeTruthy();
  });

  it("com o app fechado (cold start)", async () => {
    Notifications.getLastNotificationResponse.mockReturnValue(responseFor({ type: "message", conversationId: "77" }));
    render(<TestApp />);

    expect(await screen.findByText("Conversa 77")).toBeTruthy();
  });

  it("trocar de conversa por outra notificação atualiza o id", async () => {
    render(<TestApp />);
    await screen.findByText("Lista de conversas");

    await act(async () => {
      Notifications.__tap(responseFor({ conversationId: "1" }));
    });
    expect(await screen.findByText("Conversa 1")).toBeTruthy();

    await act(async () => {
      Notifications.__tap(responseFor({ conversationId: "2" }));
    });
    expect(await screen.findByText("Conversa 2")).toBeTruthy();
  });
});
