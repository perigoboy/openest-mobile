// tests/screens/Chat.test.js
// T043 (UI) + T045 (tempo real) + T049 (aberto por deep link só com o id).
// O hook useChat é mockado aqui — a lógica de socket/histórico/envio tem
// testes próprios em tests/hooks/useChat.test.js.
import React from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Chat from "../../src/screens/Chat";
import { ToastProvider } from "../../src/components";
import { useChat } from "../../src/hooks/useChat";
import { findConversationContact, findConversationWithUser } from "../../src/services/conversations";
import { blockUser } from "../../src/services/block";
import { getActiveConversation, clearActiveConversation } from "../../src/services/activeConversation";

jest.mock("../../src/hooks/useChat", () => ({ useChat: jest.fn() }));
jest.mock("../../src/services/conversations", () => ({
  findConversationContact: jest.fn(),
  findConversationWithUser: jest.fn(),
}));
jest.mock("../../src/services/block", () => ({ blockUser: jest.fn() }));
jest.mock("../../src/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: -3.7, longitude: -38.5 } }),
  Accuracy: { Balanced: 3 },
}));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: "file:///a.jpg" }] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));
jest.mock("../../src/services/giphy", () => ({ searchGifs: jest.fn().mockResolvedValue([]) }));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: (props) => React.createElement(View, props) };
});

const MESSAGES = [
  { id: "4", text: "Também gostei! 😊", time: "14:32", isMine: false, isImage: false, status: "sent" },
  { id: "3", text: "Adorei nosso papo de ontem!", time: "14:30", isMine: true, isImage: false, status: "sent" },
];

const sendMessage = jest.fn();
const sendImage = jest.fn();
const sendInvite = jest.fn();
const respondToInvite = jest.fn().mockResolvedValue(true);
const notifyTyping = jest.fn();
const retryMessage = jest.fn();
const deleteForEveryone = jest.fn();
const hideForMe = jest.fn();
const reload = jest.fn();

function mockChatState(overrides = {}) {
  useChat.mockReturnValue({
    messages: MESSAGES,
    loading: false,
    error: null,
    connected: true,
    otherTyping: false,
    notifyTyping,
    sendMessage,
    sendImage,
    sendInvite,
    respondToInvite,
    retryMessage,
    deleteForEveryone,
    hideForMe,
    reload,
    ...overrides,
  });
}

function renderChat(params = { conversationId: 17, contact: { id: "u2", name: "Ana Lima" } }, navOverrides = {}) {
  const navigation = {
    canGoBack: jest.fn(() => true),
    goBack: jest.fn(),
    navigate: jest.fn(),
    ...navOverrides,
  };
  const utils = render(
    <ToastProvider>
      <Chat navigation={navigation} route={{ params }} />
    </ToastProvider>
  );
  return { navigation, ...utils };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearActiveConversation();
  mockChatState();
  findConversationContact.mockResolvedValue(null);
  findConversationWithUser.mockResolvedValue(null);
});

describe("Chat — renderização", () => {
  it("mostra o contato e as mensagens numa lista invertida", () => {
    renderChat();

    expect(screen.getByText("Ana Lima")).toBeTruthy();
    expect(screen.getByText("Adorei nosso papo de ontem!")).toBeTruthy();
    expect(screen.getByTestId("chat-message-list").props.inverted).toBe(true);
    expect(screen.UNSAFE_getByType(FlatList)).toBeTruthy();
  });

  it("conecta o hook de tempo real com o id da conversa e do usuário logado", () => {
    renderChat();
    expect(useChat).toHaveBeenCalledWith(17, "me");
  });

  it("mantém o compositor dentro de um KeyboardAvoidingView", () => {
    renderChat();

    expect(screen.getByTestId("chat-keyboard-avoiding-view")).toBeTruthy();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    expect(screen.getByTestId("chat-message-input")).toBeTruthy();
  });

  it("mostra o carregamento enquanto o histórico não chegou", () => {
    mockChatState({ messages: [], loading: true });
    renderChat();
    expect(screen.getByTestId("chat-loading")).toBeTruthy();
  });

  it("mostra estado vazio convidando a mandar a primeira mensagem", () => {
    mockChatState({ messages: [] });
    renderChat();
    expect(screen.getByTestId("chat-empty")).toBeTruthy();
    expect(screen.getByText("Nenhuma mensagem ainda")).toBeTruthy();
  });

  it("mostra erro com botão de tentar de novo (sem travar a tela)", () => {
    mockChatState({ messages: [], error: "Sem conexão com a internet. Verifique sua rede." });
    renderChat();

    expect(screen.getByText("Sem conexão com a internet. Verifique sua rede.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chat-reload-button"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("avisa quando o tempo real está desconectado", () => {
    mockChatState({ connected: false });
    renderChat();
    expect(screen.getByText("Reconectando ao chat…")).toBeTruthy();
  });

  it("T046: mostra 'digitando…' quando o contato está digitando", () => {
    mockChatState({ otherTyping: true, connected: false });
    renderChat();
    expect(screen.getByText("digitando…")).toBeTruthy();
    // "digitando" tem prioridade sobre o aviso de reconexão
    expect(screen.queryByTestId("chat-connection-status")).toBeNull();
  });

  it("T046: avisa o hook a cada alteração do texto", () => {
    renderChat();
    fireEvent.changeText(screen.getByTestId("chat-message-input"), "Oi");
    expect(notifyTyping).toHaveBeenCalledWith("Oi");
  });

  it("não mostra aviso de conexão quando está conectado", () => {
    renderChat();
    expect(screen.queryByTestId("chat-connection-status")).toBeNull();
  });

  it("renderiza mensagem de imagem como imagem, não como URL", () => {
    mockChatState({
      messages: [{ id: "9", text: "https://res.cloudinary.com/x/foto.jpg", time: "10:00", isMine: false, isImage: true, status: "sent" }],
    });
    renderChat();

    expect(screen.queryByText("https://res.cloudinary.com/x/foto.jpg")).toBeNull();
    expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe("https://res.cloudinary.com/x/foto.jpg");
  });

  it("mostra o status das minhas mensagens (enviando / enviada)", () => {
    mockChatState({
      messages: [
        { id: "temp-1", text: "indo...", time: "10:01", isMine: true, isImage: false, status: "pending" },
        { id: "5", text: "foi", time: "10:00", isMine: true, isImage: false, status: "sent" },
      ],
    });
    renderChat();

    expect(screen.getByLabelText("Enviando")).toBeTruthy();
    expect(screen.getByLabelText("Enviada")).toBeTruthy();
  });
});

describe("Chat — envio", () => {
  it("envia o texto sem espaços extras e limpa o campo", () => {
    renderChat();

    fireEvent.changeText(screen.getByTestId("chat-message-input"), "  Até mais!  ");
    fireEvent.press(screen.getByTestId("chat-send-button"));

    expect(sendMessage).toHaveBeenCalledWith("Até mais!", null);
    expect(screen.getByTestId("chat-message-input").props.value).toBe("");
  });

  it("envia também pelo botão 'enviar' do teclado", () => {
    renderChat();

    fireEvent.changeText(screen.getByTestId("chat-message-input"), "Oi");
    fireEvent(screen.getByTestId("chat-message-input"), "submitEditing");

    expect(sendMessage).toHaveBeenCalledWith("Oi", null);
  });

  it("não envia mensagem vazia ou só com espaços", () => {
    renderChat();

    fireEvent.changeText(screen.getByTestId("chat-message-input"), "   ");
    fireEvent.press(screen.getByTestId("chat-send-button"));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("chat-send-button").props.accessibilityState.disabled).toBe(true);
  });

  it("mensagem que falhou pode ser reenviada com um toque", () => {
    const failed = { id: "temp-7", text: "não foi", time: "10:02", isMine: true, isImage: false, status: "failed" };
    mockChatState({ messages: [failed] });
    renderChat();

    expect(screen.getByText("Não enviada · toque para tentar de novo")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chat-message-touch-temp-7"));
    expect(retryMessage).toHaveBeenCalledWith(failed);
  });

  it("sem conversa (rota sem id) o campo fica desabilitado", () => {
    mockChatState({ messages: [] });
    renderChat({});

    expect(screen.getByText("Conversa não encontrada")).toBeTruthy();
    expect(screen.getByTestId("chat-message-input").props.editable).toBe(false);
  });
});

describe("Chat — navegação e contato", () => {
  it("volta para a lista de conversas em vez da aba anterior", () => {
    const { navigation } = renderChat();

    fireEvent.press(screen.getByTestId("chat-back-button"));
    expect(navigation.navigate).toHaveBeenCalledWith("Matches");
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("T049: aberto por notificação (só o id), busca nome e foto do contato", async () => {
    findConversationContact.mockResolvedValue({ id: "u9", name: "Bruno Alves", avatar: null });
    renderChat({ conversationId: "42" });

    expect(await screen.findByText("Bruno Alves")).toBeTruthy();
    expect(findConversationContact).toHaveBeenCalledWith("42");
  });

  it("com o contato completo nos parâmetros, não faz requisição extra", () => {
    renderChat();
    expect(findConversationContact).not.toHaveBeenCalled();
  });

  it("usa um nome neutro enquanto o contato não é identificado", () => {
    renderChat({ conversationId: "42" });
    expect(screen.getByText("Conversa")).toBeTruthy();
  });

  it("vindo do modal de match (só o perfil), encontra a conversa e abre o chat", async () => {
    findConversationWithUser.mockResolvedValue({
      conversationId: 33,
      contact: { id: "u5", name: "Julio e Talita", avatar: null },
    });
    mockChatState({ messages: [] });
    renderChat({ contact: { id: "u5", name: "Julio e Talita", photo: "https://x/p.jpg" } });

    // Enquanto procura, mostra carregando (e não "Conversa não encontrada").
    expect(screen.getByTestId("chat-loading")).toBeTruthy();

    await waitFor(() => expect(useChat).toHaveBeenLastCalledWith(33, "me"));
    expect(findConversationWithUser).toHaveBeenCalledWith("u5");
    expect(screen.getByText("Nenhuma mensagem ainda")).toBeTruthy();
    expect(screen.getByTestId("chat-message-input").props.editable).toBe(true);
  });

  it("match sem conversa no servidor mostra 'Conversa não encontrada'", async () => {
    mockChatState({ messages: [] });
    renderChat({ contact: { id: "u5", name: "Julio" } });

    expect(await screen.findByText("Conversa não encontrada")).toBeTruthy();
    expect(useChat).toHaveBeenLastCalledWith(null, "me");
  });

  it("falha ao procurar a conversa não trava a tela", async () => {
    findConversationWithUser.mockRejectedValue(new Error("Network Error"));
    mockChatState({ messages: [] });
    renderChat({ contact: { id: "u5", name: "Julio" } });

    expect(await screen.findByText("Conversa não encontrada")).toBeTruthy();
  });

  it("aba reaberta com outros parâmetros não mostra o contato anterior", async () => {
    findConversationContact.mockImplementation(async (id) =>
      id === "1" ? { id: "u1", name: "Primeira Pessoa", avatar: null } : new Promise(() => {})
    );
    const navigation = { navigate: jest.fn() };
    const { rerender } = render(<ToastProvider><Chat navigation={navigation} route={{ params: { conversationId: "1" } }} /></ToastProvider>);
    expect(await screen.findByText("Primeira Pessoa")).toBeTruthy();

    rerender(<ToastProvider><Chat navigation={navigation} route={{ params: { conversationId: "2" } }} /></ToastProvider>);

    expect(screen.queryByText("Primeira Pessoa")).toBeNull();
    expect(screen.getByText("Conversa")).toBeTruthy();
    expect(useChat).toHaveBeenLastCalledWith("2", "me");
  });

  it("bloqueia usando o id do contato", async () => {
    blockUser.mockResolvedValue({});
    renderChat();

    fireEvent.press(screen.getByTestId("chat-options-button"));
    const [, , buttons] = Alert.alert.mock.calls.at(-1);
    await act(async () => {
      await buttons.find((b) => b.text === "Bloquear").onPress();
    });

    expect(blockUser).toHaveBeenCalledWith("u2");
  });
});

describe("Chat — conversa ativa (não notificar o que já está na tela)", () => {
  it("marca a conversa como ativa ao abrir e limpa ao desmontar", () => {
    const { unmount } = renderChat();
    expect(getActiveConversation()).toBe("17");

    unmount();
    expect(getActiveConversation()).toBeNull();
  });

  it("acompanha foco e blur da navegação", () => {
    const listeners = {};
    const navigation = {
      navigate: jest.fn(),
      isFocused: () => true,
      addListener: jest.fn((event, cb) => {
        listeners[event] = cb;
        return () => delete listeners[event];
      }),
    };
    render(<ToastProvider><Chat navigation={navigation} route={{ params: { conversationId: 17, contact: { id: "u2", name: "Ana" } } }} /></ToastProvider>);

    act(() => listeners.blur());
    expect(getActiveConversation()).toBeNull();

    act(() => listeners.focus());
    expect(getActiveConversation()).toBe("17");
  });

  it("não marca como ativa se a tela abriu sem foco", async () => {
    render(
      <ToastProvider>
        <Chat
          navigation={{ navigate: jest.fn(), isFocused: () => false, addListener: () => () => {} }}
          route={{ params: { conversationId: 17, contact: { id: "u2", name: "Ana" } } }}
        />
      </ToastProvider>
    );
    await waitFor(() => expect(getActiveConversation()).toBeNull());
  });
});

describe("Chat — menu de anexos (+)", () => {
  const ImagePicker = require("expo-image-picker");
  const Location = require("expo-location");

  it("abre o menu de anexos ao tocar no +", () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    expect(screen.getByTestId("attachment-photo")).toBeTruthy();
    expect(screen.getByTestId("attachment-location")).toBeTruthy();
    expect(screen.getByTestId("attachment-gif")).toBeTruthy();
  });

  it("selecionar GIF abre o seletor de GIFs", async () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("attachment-gif"));
    });
    expect(screen.getByTestId("gif-picker")).toBeTruthy();
  });

  it("partilhar localização envia no mesmo formato do web", async () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("attachment-location"));
    });
    await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalled());
    const [text, reply] = sendMessage.mock.calls.at(-1);
    expect(text).toContain("📍 Localização partilhada");
    expect(text).toContain("maps.google.com/maps?q=-3.7,-38.5");
    expect(reply).toBeNull();
  });

  it("foto: escolher da galeria envia a imagem", async () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    fireEvent.press(screen.getByTestId("attachment-photo"));
    // Alert "Enviar foto" → "Escolher da galeria"
    const [, , buttons] = Alert.alert.mock.calls.at(-1);
    await act(async () => {
      await buttons.find((b) => b.text === "Escolher da galeria").onPress();
    });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(sendImage).toHaveBeenCalledWith({ uri: "file:///a.jpg" });
  });
});

describe("Chat — ações da mensagem (long press)", () => {
  const Clipboard = require("expo-clipboard");

  function longPress(id) {
    fireEvent(screen.getByTestId(`chat-message-touch-${id}`), "longPress");
    return Alert.alert.mock.calls.at(-1)[2]; // os botões
  }

  it("mensagem recebida: Responder, Copiar e Apagar p/ mim (sem Apagar p/ todos)", () => {
    renderChat();
    const buttons = longPress("4"); // msg do outro
    const texts = buttons.map((b) => b.text);
    expect(texts).toEqual(["↩️ Responder", "📋 Copiar", "🗑️ Apagar p/ mim", "Cancelar"]);
  });

  it("minha mensagem inclui Apagar p/ todos", () => {
    renderChat();
    const texts = longPress("3").map((b) => b.text); // msg minha
    expect(texts).toContain("🗑️ Apagar p/ todos");
  });

  it("Responder abre a barra de citação acima do campo", () => {
    renderChat();
    const buttons = longPress("4");
    act(() => buttons.find((b) => b.text === "↩️ Responder").onPress());
    expect(screen.getByTestId("chat-reply-banner")).toBeTruthy();
    // cancelar a resposta fecha a barra
    fireEvent.press(screen.getByTestId("chat-reply-cancel"));
    expect(screen.queryByTestId("chat-reply-banner")).toBeNull();
  });

  it("Copiar usa a área de transferência", async () => {
    renderChat();
    const buttons = longPress("4");
    await act(async () => {
      await buttons.find((b) => b.text === "📋 Copiar").onPress();
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Também gostei! 😊");
  });

  it("Apagar p/ mim chama hideForMe", () => {
    renderChat();
    const buttons = longPress("4");
    act(() => buttons.find((b) => b.text === "🗑️ Apagar p/ mim").onPress());
    expect(hideForMe).toHaveBeenCalledWith(expect.objectContaining({ id: "4" }));
  });

  it("Apagar p/ todos chama deleteForEveryone", () => {
    renderChat();
    const buttons = longPress("3");
    act(() => buttons.find((b) => b.text === "🗑️ Apagar p/ todos").onPress());
    expect(deleteForEveryone).toHaveBeenCalledWith(expect.objectContaining({ id: "3" }));
  });
});

describe("Chat — card de localização", () => {
  const { Linking } = require("react-native");

  it("renderiza o card e abre o mapa ao tocar", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockImplementation(() => {});
    mockChatState({
      messages: [
        { id: "7", text: "📍 Localização partilhada:\nhttp://maps.google.com/maps?q=1,2", time: "10:00", isMine: false, isImage: false, status: "sent", location: { mapsUrl: "http://maps.google.com/maps?q=1,2", latitude: 1, longitude: 2 } },
      ],
    });
    renderChat();
    fireEvent.press(screen.getByTestId("chat-location-card"));
    expect(openURL).toHaveBeenCalledWith("http://maps.google.com/maps?q=1,2");
    openURL.mockRestore();
  });
});

describe("Chat — agendamento de encontro", () => {
  it("botão de calendário abre o modal de agendar", () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-schedule-button"));
    expect(screen.getByTestId("schedule-modal")).toBeTruthy();
  });

  it("convite recebido renderiza o card com Aceitar/Recusar", () => {
    mockChatState({
      messages: [
        { id: "20", text: "[CONVITE_EVENTO]{}", time: "10:00", isMine: false, isImage: false, status: "sent",
          invite: { titulo: "Café", local: "Centro", scheduled_at: "2026-11-18T15:07:00" } },
      ],
    });
    renderChat();
    expect(screen.getByTestId("invite-card")).toBeTruthy();
    expect(screen.getByText("Café")).toBeTruthy();
    fireEvent.press(screen.getByTestId("invite-accept"));
    expect(respondToInvite).toHaveBeenCalledWith(expect.objectContaining({ id: "20" }), true, "u2");
  });

  it("convite enviado por mim mostra 'Aguardando resposta…'", () => {
    mockChatState({
      messages: [
        { id: "21", text: "[CONVITE_EVENTO]{}", time: "10:00", isMine: true, isImage: false, status: "sent",
          invite: { titulo: "Café", scheduled_at: "2026-11-18T15:07:00" } },
      ],
    });
    renderChat();
    expect(screen.getByTestId("invite-waiting")).toBeTruthy();
    expect(screen.queryByTestId("invite-accept")).toBeNull();
  });
});
