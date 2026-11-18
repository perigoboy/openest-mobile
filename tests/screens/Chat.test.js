// tests/screens/Chat.test.js
// T043 (UI) + T045 (tempo real) + T049 (aberto por deep link só com o id).
// O hook useChat é mockado aqui — a lógica de socket/histórico/envio tem
// testes próprios em tests/hooks/useChat.test.js.
import React from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Chat from "../../src/screens/Chat";
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

const MESSAGES = [
  { id: "4", text: "Também gostei! 😊", time: "14:32", isMine: false, isImage: false, status: "sent" },
  { id: "3", text: "Adorei nosso papo de ontem!", time: "14:30", isMine: true, isImage: false, status: "sent" },
];

const sendMessage = jest.fn();
const notifyTyping = jest.fn();
const retryMessage = jest.fn();
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
    retryMessage,
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
  const utils = render(<Chat navigation={navigation} route={{ params }} />);
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

    expect(sendMessage).toHaveBeenCalledWith("Até mais!");
    expect(screen.getByTestId("chat-message-input").props.value).toBe("");
  });

  it("envia também pelo botão 'enviar' do teclado", () => {
    renderChat();

    fireEvent.changeText(screen.getByTestId("chat-message-input"), "Oi");
    fireEvent(screen.getByTestId("chat-message-input"), "submitEditing");

    expect(sendMessage).toHaveBeenCalledWith("Oi");
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
    fireEvent.press(screen.getByTestId("chat-retry-temp-7"));
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
    const { rerender } = render(<Chat navigation={navigation} route={{ params: { conversationId: "1" } }} />);
    expect(await screen.findByText("Primeira Pessoa")).toBeTruthy();

    rerender(<Chat navigation={navigation} route={{ params: { conversationId: "2" } }} />);

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
    render(<Chat navigation={navigation} route={{ params: { conversationId: 17, contact: { id: "u2", name: "Ana" } } }} />);

    act(() => listeners.blur());
    expect(getActiveConversation()).toBeNull();

    act(() => listeners.focus());
    expect(getActiveConversation()).toBe("17");
  });

  it("não marca como ativa se a tela abriu sem foco", async () => {
    render(
      <Chat
        navigation={{ navigate: jest.fn(), isFocused: () => false, addListener: () => () => {} }}
        route={{ params: { conversationId: 17, contact: { id: "u2", name: "Ana" } } }}
      />
    );
    await waitFor(() => expect(getActiveConversation()).toBeNull());
  });
});
