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
const openViewOnce = jest.fn();

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
    openViewOnce,
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
    // (o fundo com textura do chat também é uma Image; busca a da mensagem)
    expect(screen.getByLabelText("Imagem enviada na conversa").props.source.uri).toBe(
      "https://res.cloudinary.com/x/foto.jpg"
    );
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

    // ⋮ abre a gaveta do contato; "Bloquear" pede confirmação nativa.
    fireEvent.press(screen.getByTestId("chat-options-button"));
    fireEvent.press(screen.getByTestId("contact-action-block"));
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
    // Câmera e galeria aparecem como opções explícitas, como no WhatsApp.
    expect(screen.getByTestId("attachment-camera")).toBeTruthy();
    expect(screen.getByTestId("attachment-gallery")).toBeTruthy();
    expect(screen.getByTestId("attachment-location")).toBeTruthy();
    expect(screen.getByTestId("attachment-gif")).toBeTruthy();
    expect(screen.getByTestId("attachment-schedule")).toBeTruthy();
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

  it("galeria: abre a PRÉ-VISUALIZAÇÃO antes de enviar", async () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    fireEvent.press(screen.getByTestId("attachment-gallery"));

    // Espera a gaveta fechar e a galeria devolver a foto.
    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(await screen.findByTestId("image-preview")).toBeTruthy();
    expect(sendImage).not.toHaveBeenCalled(); // nada sai sem confirmar

    fireEvent.changeText(screen.getByTestId("image-preview-caption"), "olha a vista");
    fireEvent.press(screen.getByTestId("image-preview-send"));

    expect(sendImage).toHaveBeenCalledWith(
      { uri: "file:///a.jpg" },
      { caption: "olha a vista", viewOnce: false }
    );
  });

  it("câmera: tira a foto, pré-visualiza e envia como VISUALIZAÇÃO ÚNICA", async () => {
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///camera.jpg" }],
    });
    renderChat();

    // Atalho da câmera direto na barra de digitação.
    fireEvent.press(screen.getByTestId("chat-camera-button"));

    await waitFor(() => expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled());
    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
    expect(await screen.findByTestId("image-preview")).toBeTruthy();

    const toggle = screen.getByTestId("image-preview-view-once");
    expect(toggle.props.accessibilityState.checked).toBe(false);
    fireEvent.press(toggle);
    expect(screen.getByTestId("image-preview-view-once").props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("image-preview-view-once-hint")).toBeTruthy();

    fireEvent.press(screen.getByTestId("image-preview-send"));
    expect(sendImage).toHaveBeenCalledWith({ uri: "file:///camera.jpg" }, { caption: "", viewOnce: true });
  });

  it("cancelar na pré-visualização não envia nada", async () => {
    renderChat();
    fireEvent.press(screen.getByTestId("chat-attach-button"));
    fireEvent.press(screen.getByTestId("attachment-gallery"));
    expect(await screen.findByTestId("image-preview")).toBeTruthy();

    fireEvent.press(screen.getByTestId("image-preview-close"));
    expect(sendImage).not.toHaveBeenCalled();
    expect(screen.queryByTestId("image-preview")).toBeNull();
  });

  it("câmera sem permissão avisa e não abre nada", async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: "denied" });
    renderChat();
    fireEvent.press(screen.getByTestId("chat-camera-button"));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Permissão necessária", expect.any(String)));
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe("Chat — ações da mensagem (long press)", () => {
  const Clipboard = require("expo-clipboard");

  // Segurar a mensagem abre a gaveta de ações (bottom sheet), não um Alert.
  function longPress(id) {
    fireEvent(screen.getByTestId(`chat-message-touch-${id}`), "longPress");
  }
  const acoesVisiveis = () =>
    ["reply", "copy", "delete-me", "delete-all"].filter((k) => screen.queryByTestId(`message-action-${k}`));

  it("mensagem recebida: Responder, Copiar e Apagar para mim (sem Apagar para todos)", () => {
    renderChat();
    longPress("4"); // msg do outro
    expect(acoesVisiveis()).toEqual(["reply", "copy", "delete-me"]);
    expect(screen.getByText("Apagar para mim")).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("minha mensagem inclui Apagar para todos", () => {
    renderChat();
    longPress("3"); // msg minha
    expect(acoesVisiveis()).toContain("delete-all");
    expect(screen.getByText("Apagar para todos")).toBeTruthy();
  });

  it("os rótulos usam ícones vetoriais, sem emojis", () => {
    renderChat();
    longPress("3");
    ["Responder", "Copiar", "Apagar para mim", "Apagar para todos"].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
    expect(screen.queryByText(/↩️|📋|🗑️/)).toBeNull();
  });

  it("Responder abre a barra de citação acima do campo", () => {
    renderChat();
    longPress("4");
    fireEvent.press(screen.getByTestId("message-action-reply"));
    expect(screen.getByTestId("chat-reply-banner")).toBeTruthy();
    // cancelar a resposta fecha a barra
    fireEvent.press(screen.getByTestId("chat-reply-cancel"));
    expect(screen.queryByTestId("chat-reply-banner")).toBeNull();
  });

  it("Copiar usa a área de transferência", async () => {
    renderChat();
    longPress("4");
    await act(async () => {
      fireEvent.press(screen.getByTestId("message-action-copy"));
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Também gostei! 😊");
  });

  it("Apagar para mim chama hideForMe", () => {
    renderChat();
    longPress("4");
    fireEvent.press(screen.getByTestId("message-action-delete-me"));
    expect(hideForMe).toHaveBeenCalledWith(expect.objectContaining({ id: "4" }));
  });

  it("Apagar para todos chama deleteForEveryone", () => {
    renderChat();
    longPress("3");
    fireEvent.press(screen.getByTestId("message-action-delete-all"));
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

// --- Checks de envio/entrega/leitura (estilo WhatsApp) --------------------
describe("Chat — checks de status", () => {
  const mine = (status) => [{ id: "1", text: "oi", time: "19:16", isMine: true, isImage: false, status }];

  // O glifo renderizado prova QUAL ícone foi usado: `checkmark` (1 check)
  // vs `checkmark-done` (2 checks). Guarda contra o bug de "1 check só".
  const glifo = (node) => String(node.props.children);

  it("enviada: 1 check só", async () => {
    mockChatState({ messages: mine("sent") });
    renderChat();
    const tick = await screen.findByTestId("tick-sent");
    expect(tick.props.accessibilityLabel).toBe("Enviada");
    expect(screen.queryByTestId("tick-delivered")).toBeNull();
    expect(screen.queryByTestId("tick-read")).toBeNull();
  });

  it("entregue e visualizada usam o MESMO ícone de 2 checks — e nunca o de 1", async () => {
    mockChatState({ messages: mine("sent") });
    const a = renderChat();
    const glifoSent = glifo(await screen.findByTestId("tick-sent"));
    a.unmount();

    mockChatState({ messages: mine("delivered") });
    const b = renderChat();
    const tickDelivered = await screen.findByTestId("tick-delivered");
    const glifoDelivered = glifo(tickDelivered);
    expect(tickDelivered.props.accessibilityLabel).toBe("Entregue");
    b.unmount();

    mockChatState({ messages: mine("read") });
    renderChat();
    const tickRead = await screen.findByTestId("tick-read");
    const glifoRead = glifo(tickRead);
    expect(tickRead.props.accessibilityLabel).toBe("Visualizada");

    // delivered e read = ✓✓ (mesmo ícone); sent = ✓ (ícone diferente)
    expect(glifoDelivered).toBe(glifoRead);
    expect(glifoDelivered).not.toBe(glifoSent);
  });

  it("mensagem recebida não mostra check nenhum", async () => {
    mockChatState({
      messages: [{ id: "2", text: "oi", time: "19:16", isMine: false, isImage: false, status: "read" }],
    });
    renderChat();
    await waitFor(() => expect(screen.getByText("oi")).toBeTruthy());
    expect(screen.queryByTestId("tick-read")).toBeNull();
    expect(screen.queryByTestId("tick-sent")).toBeNull();
  });
});


// --- Foto de visualização única -------------------------------------------
describe("Chat — foto de visualização única", () => {
  const recebida = (extra = {}) => ({
    id: "vo1", text: "", time: "20:00", isMine: false, isImage: false,
    isViewOnce: true, viewOnceOpened: false, status: "sent", ...extra,
  });

  it("NÃO mostra miniatura: só o card 'Foto' com o ícone 1", () => {
    mockChatState({ messages: [recebida()] });
    renderChat();
    expect(screen.getByTestId("view-once-vo1")).toBeTruthy();
    expect(screen.getByText("Foto")).toBeTruthy();
    expect(screen.getByTestId("view-once-closed-icon")).toBeTruthy();
    expect(screen.queryByLabelText("Imagem enviada na conversa")).toBeNull();
  });

  it("tocar abre o visualizador seguro com a foto entregue pela API", async () => {
    openViewOnce.mockResolvedValueOnce({ url: "https://res.cloudinary.com/x/unica.jpg", caption: "segredo" });
    mockChatState({ messages: [recebida()] });
    renderChat();

    await act(async () => {
      fireEvent.press(screen.getByTestId("view-once-vo1"));
    });

    expect(openViewOnce).toHaveBeenCalledWith(expect.objectContaining({ id: "vo1" }));
    expect(screen.getByTestId("view-once-viewer")).toBeTruthy();
    expect(screen.getByTestId("view-once-viewer-image").props.source.uri).toBe(
      "https://res.cloudinary.com/x/unica.jpg"
    );
    expect(screen.getByText("segredo")).toBeTruthy();

    // Bloqueia print de tela enquanto a foto está aberta.
    expect(require("expo-screen-capture").usePreventScreenCapture).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("view-once-viewer-close"));
    expect(screen.queryByTestId("view-once-viewer")).toBeNull();
  });

  it("já aberta: mostra 'Aberta' e o toque fica desativado", () => {
    mockChatState({ messages: [recebida({ viewOnceOpened: true })] });
    renderChat();
    expect(screen.getByText("Aberta")).toBeTruthy();
    expect(screen.getByTestId("view-once-opened-icon")).toBeTruthy();
    expect(screen.getByTestId("view-once-vo1").props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId("view-once-vo1"));
    expect(openViewOnce).not.toHaveBeenCalled();
  });

  it("segunda tentativa recusada pela API avisa e não abre", async () => {
    const err = new Error("Esta foto já foi aberta.");
    err.code = "already_opened";
    openViewOnce.mockRejectedValueOnce(err);
    mockChatState({ messages: [recebida()] });
    renderChat();

    await act(async () => {
      fireEvent.press(screen.getByTestId("view-once-vo1"));
    });
    expect(screen.queryByTestId("view-once-viewer")).toBeNull();
    expect(await screen.findByText("Esta foto já foi aberta.")).toBeTruthy();
  });

  it("quem enviou vê 'Foto' com os ticks e não consegue abrir", () => {
    mockChatState({
      messages: [recebida({ id: "vo2", isMine: true, status: "read" })],
    });
    renderChat();
    expect(screen.getByText("Foto")).toBeTruthy();
    expect(screen.getByTestId("tick-read")).toBeTruthy();
    expect(screen.getByTestId("view-once-vo2").props.accessibilityState.disabled).toBe(true);
  });

  it("para quem enviou, vira 'Aberta' quando o outro abre", () => {
    mockChatState({ messages: [recebida({ id: "vo3", isMine: true, viewOnceOpened: true, status: "read" })] });
    renderChat();
    expect(screen.getByText("Aberta")).toBeTruthy();
  });
});
