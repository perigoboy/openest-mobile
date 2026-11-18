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
import { unmatch } from "../../services/match";
import { SOCKET_EVENTS, onSocketEvent } from "../../services/socket";
import { colors, radius, spacing, typography } from "../../styles/theme";

function ConversationItem({ conversation, onPress, onUnmatch }) {
  return (
    <View style={styles.conversationRow}>
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

      {/* T041 — botão de opções: Desfazer match */}
      <TouchableOpacity
        testID={`conversation-options-${conversation.id}`}
        style={styles.optionsButton}
        onPress={() => {
          Alert.alert(
            "Opções",
            undefined,
            [
              {
                text: "Desfazer match",
                style: "destructive",
                onPress: onUnmatch,
              },
              { text: "Cancelar", style: "cancel" },
            ],
            { cancelable: true }
          );
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Mais opções da conversa com ${conversation.name}`}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
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

  // T045 — lista viva: novo match ou nova mensagem atualizam a lista sem o
  // usuário precisar puxar para recarregar.
  useEffect(() => {
    const refresh = () => loadConversations(true);
    const offMatch = onSocketEvent(SOCKET_EVENTS.NEW_MATCH, refresh);
    const offNotification = onSocketEvent(SOCKET_EVENTS.NOTIFICATION, refresh);
    return () => {
      offMatch();
      offNotification();
    };
  }, [loadConversations]);

  function openConversation(conversation) {
    navigation?.navigate?.("Chat", {
      conversationId: conversation.id,
      contact: {
        // id do outro usuário — necessário para bloquear a partir do Chat (T037)
        id: conversation.other_user_id ?? null,
        name: conversation.name,
        avatar: conversation.img,
      },
    });
  }

  // T041 — Desfazer match: dispara DELETE na rota de match e remove a
  // conversa da lista imediatamente (critério de aceite: suma da lista de
  // ambos os usuários).
  async function handleUnmatch(conversationToRemove) {
    Alert.alert(
      "Desfazer match",
      `Tem certeza que deseja desfazer o match com ${conversationToRemove.name}? A conversa será removida.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desfazer",
          style: "destructive",
          onPress: async () => {
            try {
              await unmatch(conversationToRemove.id);
              setConversations((current) =>
                current.filter((c) => c.id !== conversationToRemove.id)
              );
              Alert.alert(
                "Match desfazido",
                "A conversa foi removida da sua lista."
              );
            } catch (error) {
              console.error("Erro ao desfazer match:", error);
              Alert.alert(
                "Não foi possível desfazer o match",
                error?.response?.data?.error || "Tente novamente em alguns instantes."
              );
            }
          },
        },
      ]
    );
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
              onUnmatch={() => handleUnmatch(item)}
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
    flex: 1,
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
  // Botão do estado vazio (estilos perdidos no merge do T041/T042 — sem eles
  // o texto ficava preto sobre o fundo escuro, invisível).
  emptyCTA: {
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  emptyCTAText: {
    ...typography.body,
    fontWeight: "700",
    color: colors.white,
  },
  // T041 — botão de opções da conversa (ellipsis)
  optionsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
});
