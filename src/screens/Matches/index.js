import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components";
import { colors, radius, spacing, typography } from "../../styles/theme";

const PREVIEW_CONVERSATIONS = [
  {
    id: "mariana-costa",
    name: "Mariana Costa",
    lastMessage: "Também gostei! Foi muito legal te conhecer 😊",
    time: "14:32",
    unreadCount: 2,
    online: true,
  },
];

function ConversationItem({ conversation, onPress }) {
  return (
    <TouchableOpacity
      testID={`conversation-${conversation.id}`}
      style={styles.conversation}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversa com ${conversation.name}`}
    >
      <View>
        <Avatar
          uri={conversation.avatar || conversation.photo}
          name={conversation.name}
          size={56}
        />
        {conversation.online ? <View style={styles.onlineIndicator} /> : null}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeading}>
          <Text style={styles.contactName} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={styles.time}>{conversation.time}</Text>
        </View>
        <View style={styles.conversationPreview}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Matches({ navigation }) {
  function openConversation(contact) {
    navigation?.navigate?.("Chat", { contact });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversas</Text>
        <Text style={styles.subtitle}>Seus matches e mensagens</Text>
      </View>

      <FlatList
        testID="conversations-list"
        data={PREVIEW_CONVERSATIONS}
        keyExtractor={(conversation) => conversation.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => openConversation(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={42}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>Suas conversas aparecem aqui</Text>
            <Text style={styles.emptySubtitle}>
              Quando você der match, poderá começar a conversar por aqui.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  conversation: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  onlineIndicator: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.success,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  conversationHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactName: {
    ...typography.h3,
    flex: 1,
    color: colors.text,
    marginRight: spacing.sm,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  conversationPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  lastMessage: {
    ...typography.body,
    flex: 1,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  unreadCount: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
