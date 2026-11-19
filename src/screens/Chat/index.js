// T043 — UI do chat · T045 — mensagens em tempo real (Socket.IO)
// T046 — indicador de "digitando…" (eventos typing_start/typing_stop do backend)
// T049 — também é aberto por Deep Link a partir de uma notificação
// (openest://chat/<conversationId>), recebendo só o id da conversa.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { Avatar, Input, useToast } from "../../components";
import GifPickerModal from "../../components/GifPickerModal";
import AttachmentMenu from "../../components/AttachmentMenu";
import ScheduleModal from "../../components/ScheduleModal";
import InviteCard from "../../components/InviteCard";
import { colors, radius, spacing, typography } from "../../styles/theme";
import { blockUser } from "../../services/block";
import { findConversationContact, findConversationWithUser } from "../../services/conversations";
import {
  clearActiveConversation,
  setActiveConversation,
} from "../../services/activeConversation";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../hooks/useChat";
import { MESSAGE_STATUS } from "../../utils/chatMessages";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const DEFAULT_CONTACT_NAME = "Conversa";
const DELETED_TEXT = "🚫 Mensagem apagada";

// Azul-ciano dos checks de leitura (mesmo tom do web).
const READ_TICK_COLOR = "#38BDF8";
const TICK_COLOR = "rgba(255,255,255,0.65)"; // cinza/branco translúcido

// 1 check = enviada · 2 checks cinzas = entregue · 2 checks AZUIS = lida.
// Os azuis só aparecem quando NINGUÉM está em Modo Discreto (regra aplicada
// no servidor, que nunca manda status `read` nesse caso).
function MessageStatusIcon({ status }) {
  if (status === MESSAGE_STATUS.PENDING) {
    return (
      <Ionicons name="time-outline" size={13} color={colors.textMuted} accessibilityLabel="Enviando" testID="tick-pending" />
    );
  }
  if (status === MESSAGE_STATUS.FAILED) {
    return (
      <Ionicons name="alert-circle" size={14} color={colors.dangerLight} accessibilityLabel="Falha no envio" testID="tick-failed" />
    );
  }
  if (status === MESSAGE_STATUS.READ) {
    return (
      <Ionicons name="checkmark-done" size={14} color={READ_TICK_COLOR} accessibilityLabel="Visualizada" testID="tick-read" />
    );
  }
  if (status === MESSAGE_STATUS.DELIVERED) {
    return (
      <Ionicons name="checkmark-done" size={14} color={TICK_COLOR} accessibilityLabel="Entregue" testID="tick-delivered" />
    );
  }
  return (
    <Ionicons name="checkmark" size={14} color={TICK_COLOR} accessibilityLabel="Enviada" testID="tick-sent" />
  );
}

function ReplyQuote({ replyTo }) {
  if (!replyTo?.content) return null;
  return (
    <View style={styles.quote}>
      <Text style={styles.quoteSender} numberOfLines={1}>
        {replyTo.sender === "Você" ? "Você" : replyTo.sender || "Mensagem"}
      </Text>
      <Text style={styles.quoteText} numberOfLines={1}>{replyTo.content}</Text>
    </View>
  );
}

function LocationCard({ location }) {
  return (
    <TouchableOpacity
      testID="chat-location-card"
      style={styles.locationCard}
      activeOpacity={0.8}
      onPress={() => location.mapsUrl && Linking.openURL(location.mapsUrl)}
      accessibilityRole="button"
      accessibilityLabel="Abrir localização no mapa"
    >
      <View style={styles.locationIcon}>
        <Ionicons name="location" size={20} color={colors.white} />
      </View>
      <View style={styles.locationTexts}>
        <Text style={styles.locationTitle}>Localização partilhada</Text>
        <Text style={styles.locationLink}>Ver no mapa</Text>
      </View>
    </TouchableOpacity>
  );
}

function MessageBubble({ message, imageSize, onRetry, onLongPress, onInviteRespond, responding }) {
  const failed = message.status === MESSAGE_STATUS.FAILED;
  const deleted = message.text === DELETED_TEXT;

  let content;
  if (deleted) {
    content = <Text style={[styles.messageText, styles.deletedText]}>{message.text}</Text>;
  } else if (message.invite) {
    content = (
      <InviteCard
        invite={message.invite}
        isMine={message.isMine}
        responding={responding}
        onAccept={() => onInviteRespond(message, true)}
        onReject={() => onInviteRespond(message, false)}
      />
    );
  } else if (message.isImage) {
    content = (
      <Image
        source={{ uri: resolveMediaUrl(message.text) || message.text }}
        style={[styles.messageImage, { width: imageSize, height: imageSize }]}
        accessibilityLabel="Imagem enviada na conversa"
      />
    );
  } else if (message.location) {
    content = <LocationCard location={message.location} />;
  } else {
    content = <Text style={styles.messageText}>{message.text}</Text>;
  }

  const bubble = (
    <View
      style={[
        styles.messageBubble,
        message.isMine ? styles.myMessage : styles.theirMessage,
        failed && styles.failedMessage,
      ]}
    >
      {!deleted ? <ReplyQuote replyTo={message.replyTo} /> : null}
      {content}
      <View style={styles.messageMeta}>
        <Text style={[styles.messageTime, message.isMine && styles.myMessageTime]}>{message.time}</Text>
        {message.isMine ? <MessageStatusIcon status={message.status} /> : null}
      </View>
      {failed ? <Text style={styles.failedHint}>Não enviada · toque para tentar de novo</Text> : null}
    </View>
  );

  return (
    <View
      testID={`chat-message-${message.id}`}
      style={[styles.messageRow, message.isMine ? styles.myMessageRow : styles.theirMessageRow]}
    >
      <TouchableOpacity
        testID={`chat-message-touch-${message.id}`}
        onPress={failed ? () => onRetry(message) : undefined}
        onLongPress={() => onLongPress(message)}
        delayLongPress={250}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          failed
            ? "Mensagem não enviada. Toque para tentar de novo"
            : "Segure para ações da mensagem"
        }
      >
        {bubble}
      </TouchableOpacity>
    </View>
  );
}

export default function Chat({ navigation, route }) {
  const params = route?.params || {};
  const paramConversationId = params.conversationId ?? null;
  const paramContact = params.contact || {};
  const paramContactId = paramContact.id ?? null;
  const paramContactName = paramContact.name || params.name || null;
  const { user } = useAuth();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const imageSize = Math.round(Math.min(240, width * 0.6));
  const [attachOpen, setAttachOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // T049 — aberto por notificação: veio só o id da conversa → busca o contato.
  const needsContactLookup = paramConversationId != null && (!paramContactName || paramContactId == null);
  // Modal de match da Descoberta: veio só o perfil → busca a conversa do match.
  const needsConversationLookup = paramConversationId == null && paramContactId != null;

  // Dados buscados na lista de conversas, marcados com a chave dos parâmetros
  // que os originaram: se a aba for reaberta com outros parâmetros, o
  // resultado antigo é ignorado na hora (sem "piscar" dados da conversa errada).
  const lookupKey = `${paramConversationId ?? ""}|${paramContactId ?? ""}`;
  const [lookup, setLookup] = useState({ key: null, conversationId: null, contact: null });
  const lookupIsCurrent = lookup.key === lookupKey;
  const resolvingConversation = needsConversationLookup && !lookupIsCurrent;
  const [draft, setDraft] = useState("");

  const conversationId = paramConversationId ?? (lookupIsCurrent ? lookup.conversationId : null);
  const resolvedContact = lookupIsCurrent ? lookup.contact : null;
  const {
    messages,
    loading,
    error,
    connected,
    otherTyping,
    notifyTyping,
    sendMessage,
    sendImage,
    sendInvite,
    respondToInvite,
    retryMessage,
    deleteForEveryone,
    hideForMe,
    reload,
    markAsRead,
  } = useChat(conversationId, user?.id);

  // Voltar para a tela do Chat (sem remontar) também conta como leitura —
  // o join só acontece na montagem/reconexão.
  useEffect(() => {
    if (!markAsRead) return undefined;
    markAsRead();
    const unsubscribe = navigation?.addListener?.("focus", () => markAsRead());
    return unsubscribe;
  }, [navigation, markAsRead]);

  const contactName = paramContactName || resolvedContact?.name || DEFAULT_CONTACT_NAME;
  const contactPhoto = paramContact.avatar || paramContact.photo || params.avatar || resolvedContact?.avatar;
  const contactId = paramContactId ?? resolvedContact?.id ?? null;

  useEffect(() => {
    if (!needsContactLookup && !needsConversationLookup) return undefined;

    let cancelled = false;
    const request = needsContactLookup
      ? findConversationContact(paramConversationId).then((contact) => ({ conversationId: null, contact }))
      : findConversationWithUser(paramContactId);

    request
      .then((found) => {
        if (cancelled) return;
        setLookup({ key: lookupKey, conversationId: found?.conversationId ?? null, contact: found?.contact ?? null });
      })
      .catch((err) => {
        console.error("Erro ao identificar a conversa:", err?.message || err);
        if (!cancelled) setLookup({ key: lookupKey, conversationId: null, contact: null });
      });
    return () => {
      cancelled = true;
    };
  }, [lookupKey, paramConversationId, paramContactId, needsContactLookup, needsConversationLookup]);

  // Marca a conversa como "aberta" enquanto a tela está em foco — assim
  // mensagens dela não geram notificação (T048).
  useEffect(() => {
    if (!conversationId) return undefined;
    const focused = typeof navigation?.isFocused === "function" ? navigation.isFocused() : true;
    if (focused) setActiveConversation(conversationId);
    const unsubscribeFocus = navigation?.addListener?.("focus", () => setActiveConversation(conversationId));
    const unsubscribeBlur = navigation?.addListener?.("blur", () => clearActiveConversation(conversationId));
    return () => {
      if (typeof unsubscribeFocus === "function") unsubscribeFocus();
      if (typeof unsubscribeBlur === "function") unsubscribeBlur();
      clearActiveConversation(conversationId);
    };
  }, [conversationId, navigation]);

  function goBack() {
    navigation?.navigate?.("Matches");
  }

  function handleChangeDraft(text) {
    setDraft(text);
    notifyTyping?.(text);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || !conversationId) return;
    setDraft("");
    sendMessage(text, replyTo);
    setReplyTo(null);
  }

  // ── Menu de anexos (+) ────────────────────────────────────────────────
  function handleAttachSelect(key) {
    setAttachOpen(false);
    if (key === "photo") handleAttachPhoto();
    else if (key === "location") handleShareLocation();
    else if (key === "gif") setGifOpen(true);
  }

  function handleAttachPhoto() {
    Alert.alert("Enviar foto", undefined, [
      { text: "Tirar foto", onPress: () => pickImage("camera") },
      { text: "Escolher da galeria", onPress: () => pickImage("library") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function pickImage(source) {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.status !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso para enviar a foto.");
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (asset?.uri) sendImage(asset);
    } catch (err) {
      console.error("Erro ao selecionar imagem:", err?.message || err);
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  }

  async function handleShareLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission?.status !== "granted") {
        Alert.alert("Permissão necessária", "Ative a localização para partilhar.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      // Mesmo formato do web (handleLocation).
      const text = `📍 Localização partilhada:\nhttp://maps.google.com/maps?q=${latitude},${longitude}`;
      sendMessage(text, replyTo);
      setReplyTo(null);
    } catch (err) {
      console.error("Erro ao obter localização:", err?.message || err);
      Alert.alert("Erro", "Não foi possível obter a sua localização.");
    }
  }

  function handleSelectGif(url) {
    setGifOpen(false);
    sendMessage(url, replyTo);
    setReplyTo(null);
  }

  // Agendamento de encontro (convite [CONVITE_EVENTO]).
  function handleScheduleSubmit(payload) {
    setScheduleOpen(false);
    sendInvite(payload);
  }

  async function handleInviteRespond(message, accept) {
    if (respondingInvite) return;
    setRespondingInvite(true);
    try {
      const ok = await respondToInvite(message, accept, contactId);
      if (!ok) {
        Alert.alert("Erro", "Não foi possível responder ao convite. Tente novamente.");
      }
    } finally {
      setRespondingInvite(false);
    }
  }

  // ── Menu de ações da mensagem (long press) ────────────────────────────
  function handleMessageLongPress(message) {
    if (!message || String(message.id).startsWith("temp-")) return;
    const deleted = message.text === DELETED_TEXT;
    const buttons = [];
    if (!deleted && !message.isImage) {
      buttons.push({ text: "↩️ Responder", onPress: () => setReplyTo(message) });
      buttons.push({ text: "📋 Copiar", onPress: () => handleCopy(message) });
    }
    buttons.push({ text: "🗑️ Apagar p/ mim", style: "destructive", onPress: () => hideForMe(message) });
    if (message.isMine && !deleted) {
      buttons.push({ text: "🗑️ Apagar p/ todos", style: "destructive", onPress: () => deleteForEveryone(message) });
    }
    buttons.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Mensagem", undefined, buttons, { cancelable: true });
  }

  async function handleCopy(message) {
    try {
      await Clipboard.setStringAsync(message.text);
      toast.show("Mensagem copiada", { type: "success" });
    } catch (err) {
      console.error("Erro ao copiar:", err?.message || err);
      toast.show("Não foi possível copiar", { type: "error" });
    }
  }

  // T037 — Bloquear usuário a partir da tela de Chat.
  async function handleBlockUser() {
    if (!contactId) {
      Alert.alert("Não foi possível identificar o usuário.");
      return;
    }

    Alert.alert(
      "Bloquear usuário",
      `Tem certeza que deseja bloquear ${contactName}? Após o bloqueio, vocês não aparecerão mais um para o outro.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(contactId);
              Alert.alert("Usuário bloqueado", "A conversa foi encerrada.");
              navigation?.navigate?.("Matches");
            } catch (err) {
              console.error("Erro ao bloquear usuário:", err);
              Alert.alert(
                "Não foi possível bloquear",
                err?.response?.data?.error || "Tente novamente em alguns instantes."
              );
            }
          },
        },
      ]
    );
  }

  const canSend = !!conversationId && !!draft.trim();

  function renderBody() {
    if (messages.length > 0) {
      return (
        <FlatList
          testID="chat-message-list"
          data={messages}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              imageSize={imageSize}
              onRetry={retryMessage}
              onLongPress={handleMessageLongPress}
              onInviteRespond={handleInviteRespond}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        />
      );
    }

    if (loading || resolvingConversation) {
      return (
        <View style={styles.centered} testID="chat-loading">
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando mensagens" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered} testID="chat-error">
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.centeredTitle}>{error}</Text>
          <TouchableOpacity
            testID="chat-reload-button"
            style={styles.reloadButton}
            onPress={reload}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar as mensagens de novo"
          >
            <Text style={styles.reloadText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centered} testID="chat-empty">
        <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
        <Text style={styles.centeredTitle}>
          {conversationId ? "Nenhuma mensagem ainda" : "Conversa não encontrada"}
        </Text>
        <Text style={styles.centeredSubtitle}>
          {conversationId
            ? `Mande a primeira mensagem para ${contactName}. 👋`
            : "Volte para a lista e escolha uma conversa."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        testID="chat-keyboard-avoiding-view"
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="chat-back-button"
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Voltar para conversas"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Avatar uri={contactPhoto} name={contactName} size={44} />

          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1} accessibilityRole="header">
              {contactName}
            </Text>
            {otherTyping ? (
              <View style={styles.connectionStatus} testID="chat-typing-indicator" accessibilityLiveRegion="polite">
                <Text style={styles.typingText}>digitando…</Text>
              </View>
            ) : !connected && conversationId ? (
              <View style={styles.connectionStatus} testID="chat-connection-status">
                <View style={styles.offlineIndicator} />
                <Text style={styles.connectionText}>Reconectando ao chat…</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            testID="chat-options-button"
            style={styles.headerAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            onPress={handleBlockUser}
          >
            <Ionicons name="ellipsis-vertical" size={21} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {renderBody()}

        {/* Barra de resposta (citação) acima do campo, com X para cancelar */}
        {replyTo ? (
          <View style={styles.replyBanner} testID="chat-reply-banner">
            <View style={styles.replyBar} />
            <View style={styles.replyContent}>
              <Text style={styles.replySender} numberOfLines={1}>
                Respondendo {replyTo.isMine ? "a você" : contactName}
              </Text>
              <Text style={styles.replyPreview} numberOfLines={1}>
                {replyTo.isImage ? "📷 Foto" : replyTo.text}
              </Text>
            </View>
            <TouchableOpacity
              testID="chat-reply-cancel"
              onPress={() => setReplyTo(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar resposta"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TouchableOpacity
            testID="chat-attach-button"
            style={styles.attachButton}
            onPress={() => setAttachOpen(true)}
            disabled={!conversationId}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Anexar foto, localização ou GIF"
          >
            <Ionicons name="add" size={24} color={colors.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="chat-schedule-button"
            style={styles.attachButton}
            onPress={() => setScheduleOpen(true)}
            disabled={!conversationId}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Agendar encontro"
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primaryLight} />
          </TouchableOpacity>
          <Input
            testID="chat-message-input"
            accessibilityLabel="Mensagem"
            containerStyle={styles.inputContainer}
            placeholder="Escreva uma mensagem..."
            value={draft}
            onChangeText={handleChangeDraft}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!!conversationId}
            maxLength={2000}
          />
          <TouchableOpacity
            testID="chat-send-button"
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !canSend }}
          >
            <Ionicons name="send" size={19} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AttachmentMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSelect={handleAttachSelect}
      />
      <GifPickerModal visible={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleSelectGif} />
      <ScheduleModal
        visible={scheduleOpen}
        contactName={contactName}
        conversationId={conversationId}
        otherUserId={contactId}
        onClose={() => setScheduleOpen(false)}
        onSubmit={handleScheduleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  contactName: {
    ...typography.h3,
    color: colors.text,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  offlineIndicator: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
    marginRight: spacing.xs,
  },
  connectionText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  typingText: {
    ...typography.caption,
    fontStyle: "italic",
    color: colors.primaryLight,
  },
  headerAction: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  centeredTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
  },
  centeredSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  reloadButton: {
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  reloadText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.white,
  },
  messageRow: {
    width: "100%",
    marginBottom: spacing.sm,
  },
  myMessageRow: {
    alignItems: "flex-end",
  },
  theirMessageRow: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
  },
  myMessage: {
    backgroundColor: colors.primaryDark,
    borderBottomRightRadius: radius.sm,
  },
  theirMessage: {
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: radius.sm,
  },
  failedMessage: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
  },
  messageImage: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.xs,
    columnGap: spacing.xs,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  // T052 — textMuted sobre a minha bolha (primaryDark) dava 3.3:1; primaryLight dá 4.6:1.
  myMessageTime: {
    color: colors.primaryLight,
  },
  failedHint: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    columnGap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  attachButton: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  // Citação (responder) dentro do balão
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
    opacity: 0.9,
  },
  quoteSender: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primaryLight,
  },
  quoteText: {
    ...typography.caption,
    color: colors.text,
  },
  deletedText: {
    fontStyle: "italic",
    color: colors.textMuted,
  },
  // Card de localização
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTexts: {
    flex: 1,
  },
  locationTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  locationLink: {
    ...typography.caption,
    color: colors.primaryLight,
    marginTop: 1,
  },
  // Barra de resposta acima do campo
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  replyBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.primaryLight,
  },
  replyPreview: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
