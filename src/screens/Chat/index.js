import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Input } from "../../components";
import { colors, radius, spacing, typography } from "../../styles/theme";
import { blockUser } from "../../services/block";

const INITIAL_MESSAGES = [
  { id: "4", text: "Também gostei! Foi muito legal te conhecer 😊", time: "14:32", isMine: false },
  { id: "3", text: "Adorei nosso papo de ontem!", time: "14:30", isMine: true },
  { id: "2", text: "Que bom que a gente deu match 💜", time: "14:28", isMine: false },
  { id: "1", text: "Oi! Tudo bem?", time: "14:26", isMine: true },
];

function MessageBubble({ message }) {
  return (
    <View
      style={[
        styles.messageRow,
        message.isMine ? styles.myMessageRow : styles.theirMessageRow,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          message.isMine ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={styles.messageText}>{message.text}</Text>
        <View style={styles.messageMeta}>
          <Text style={styles.messageTime}>{message.time}</Text>
          {message.isMine ? (
            <Ionicons
              name="checkmark-done"
              size={14}
              color={colors.primaryLight}
              accessibilityLabel="Enviada"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function Chat({ navigation, route }) {
  const contact = route?.params?.contact || {};
  const contactName = contact.name || route?.params?.name || "Mariana Costa";
  const contactPhoto = contact.avatar || contact.photo;
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const nextMessageId = useRef(0);

  function goBack() {
    navigation?.navigate?.("Matches");
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMessages((currentMessages) => [
      {
        id: `local-${++nextMessageId.current}`,
        text,
        time,
        isMine: true,
      },
      ...currentMessages,
    ]);
    setDraft("");
  }

  // T037 — Bloquear usuário a partir da tela de Chat.
  async function handleBlockUser() {
    const blockedId = contact.id || contact.username;
    if (!blockedId) {
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
              await blockUser(blockedId);
              Alert.alert("Usuário bloqueado", "A conversa foi encerrada.");
              navigation?.navigate?.("Matches");
            } catch (error) {
              console.error("Erro ao bloquear usuário:", error);
              Alert.alert(
                "Não foi possível bloquear",
                error?.response?.data?.error || "Tente novamente em alguns instantes."
              );
            }
          },
        },
      ]
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
            <Text style={styles.contactName} numberOfLines={1}>
              {contactName}
            </Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineIndicator} />
              <Text style={styles.onlineText}>online agora</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mais opções"
            onPress={handleBlockUser}
          >
            <Ionicons name="ellipsis-vertical" size={21} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <FlatList
          testID="chat-message-list"
          data={messages}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        />

        <View style={styles.composer}>
          <Input
            testID="chat-message-input"
            accessibilityLabel="Mensagem"
            containerStyle={styles.inputContainer}
            placeholder="Escreva uma mensagem..."
            value={draft}
            onChangeText={setDraft}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            testID="chat-send-button"
            style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!draft.trim()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !draft.trim() }}
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
    width: 40,
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
  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineIndicator: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  onlineText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  headerAction: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  messageText: {
    ...typography.body,
    color: colors.text,
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
    fontSize: 10,
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
