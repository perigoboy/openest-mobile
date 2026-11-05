import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components";
import { fetchConversations } from "../../services/conversations";
import { colors, radius, spacing, typography } from "../../styles/theme";

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
      <Avatar
        uri={conversation.img}
        name={conversation.name}
        size={56}
      />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeading}>
          <Text style={styles.contactName} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={styles.time}>{conversation.timestamp}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {conversation.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Matches({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await fetchConversations();
      setConversations(result);
    } catch (error) {
      console.error(
        "Erro ao carregar conversas:",
        error?.response?.status,
        error?.response?.data || error?.message
      );
      Alert.alert(
        "Erro",
        error?.response?.data?.error ||
          "Não foi possível carregar suas conversas. Tente novamente."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function openConversation(conversation) {
    navigation?.navigate?.("Chat", {
      conversationId: conversation.id,
      contact: {
        name: conversation.name,
        avatar: conversation.img,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversas</Text>
        <Text style={styles.subtitle}>Seus matches e mensagens</Text>
      </View>

      {loading ? (
        <View style={styles.loading} testID="conversations-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={conversations}
          keyExtractor={(conversation) => String(conversation.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => openConversation(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              tintColor={colors.primaryLight}
              colors={[colors.primary]}
              accessibilityLabel="Atualizar conversas"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState} testID="conversations-empty">
              <Ionicons
                name="chatbubbles-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                Você ainda não tem matches
              </Text>
              <Text style={styles.emptySubtitle}>
                Curtir perfis no Descobrir é o primeiro passo para começar a
                conversar por aqui.
              </Text>
              <TouchableOpacity
                testID="btn-go-to-discovery"
                style={styles.emptyCTA}
                onPress={() => navigation?.navigate?.("Discovery")}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Ir para Descobrir"
              >
                <Text style={styles.emptyCTAText}>Descobrir perfis</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  conversation: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
  lastMessage: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
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
  // T042 — CTA do estado vazio
  emptyCTA: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  emptyCTAText: {
    color: colors.white,
    fontWeight: "700",
  },
});
