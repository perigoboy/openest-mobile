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
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Input } from "../../components";
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

const DEFAULT_CONTACT_NAME = "Conversa";

function MessageStatusIcon({ status }) {
  if (status === MESSAGE_STATUS.PENDING) {
    return (
      <Ionicons name="time-outline" size={13} color={colors.textMuted} accessibilityLabel="Enviando" />
    );
  }
  if (status === MESSAGE_STATUS.FAILED) {
    return (
      <Ionicons name="alert-circle" size={14} color={colors.dangerLight} accessibilityLabel="Falha no envio" />
    );
  }
  return (
    <Ionicons name="checkmark-done" size={14} color={colors.primaryLight} accessibilityLabel="Enviada" />
  );
}

function MessageBubble({ message, imageSize, onRetry }) {
  const failed = message.status === MESSAGE_STATUS.FAILED;
  const bubble = (
    <View
      style={[
        styles.messageBubble,
        message.isMine ? styles.myMessage : styles.theirMessage,
        failed && styles.failedMessage,
      ]}
    >
      {message.isImage ? (
        <Image
          source={{ uri: message.text }}
          style={[styles.messageImage, { width: imageSize, height: imageSize }]}
          accessibilityLabel="Imagem enviada na conversa"
        />
      ) : (
        <Text style={styles.messageText}>{message.text}</Text>
      )}
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
      {failed ? (
        <TouchableOpacity
          testID={`chat-retry-${message.id}`}
          onPress={() => onRetry(message)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Mensagem não enviada. Toque para tentar de novo"
        >
          {bubble}
        </TouchableOpacity>
      ) : (
        bubble
      )}
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
  const { width } = useWindowDimensions();
  const imageSize = Math.round(Math.min(240, width * 0.6));

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
    retryMessage,
    reload,
  } = useChat(conversationId, user?.id);

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
    sendMessage(text);
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
            <MessageBubble message={item} imageSize={imageSize} onRetry={retryMessage} />
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

        <View style={styles.composer}>
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
});
