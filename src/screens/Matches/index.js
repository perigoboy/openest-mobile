// Lista de conversas (estilo WhatsApp): busca no topo, linhas limpas com
// divisória recuada, hora da última mensagem à direita, prévia com ícone do
// tipo (foto, localização, convite...) e os ticks de status na própria
// lista, além do badge de não lidas. Ações (desfazer match) no toque longo.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components";
import { ActionSheet } from "../../components/BottomSheet";
import { fetchConversations } from "../../services/conversations";
import { unmatch } from "../../services/match";
import { SOCKET_EVENTS, onSocketEvent } from "../../services/socket";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { radius, spacing, typography } from "../../styles/theme";
import { isImageContent, parseInviteMessage, parseLocationMessage } from "../../utils/chatMessages";
import { tapLight } from "../../utils/haptics";

// ── Formatação (exportada para testes) ──────────────────────────────────
// Hoje → "14:32" · Ontem → "Ontem" · Esta semana → "seg." · Antes → "12/11/26".
// Valores que não são data (rótulos antigos como "Agora") passam direto.
export function formatListTime(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (days <= 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Ontem";
  if (days < 7) return date.toLocaleDateString("pt-BR", { weekday: "short" });
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const TYPE_ICONS = {
  image: "camera-outline",
  view_once: "eye-outline",
  location: "location-outline",
  invite: "calendar-outline",
  invite_answer: "calendar-outline",
  deleted: "ban-outline",
};

// Prévia da última mensagem: { icon, text, mine, status, italic, isNew }.
// Usa o resumo tipado da API (`last_message`) e, para respostas antigas,
// classifica o texto bruto (`lastMessage`).
export function conversationPreview(conversation = {}) {
  const last = conversation.last_message;
  if (last) {
    const icon = last.type === "view_once" && last.is_opened ? "eye-off-outline" : TYPE_ICONS[last.type] || null;
    return {
      icon,
      text: last.preview || "",
      mine: !!last.is_mine,
      status: last.status || null,
      italic: last.type === "deleted",
      isNew: false,
    };
  }
  const raw = conversation.lastMessage;
  if (!raw || raw === "Nenhuma mensagem") {
    return { icon: null, text: "Novo match · diga oi", mine: false, status: null, italic: false, isNew: true };
  }
  if (isImageContent(raw)) return { icon: TYPE_ICONS.image, text: "Foto", mine: false, status: null, italic: false, isNew: false };
  if (parseInviteMessage(raw)) return { icon: TYPE_ICONS.invite, text: "Convite de encontro", mine: false, status: null, italic: false, isNew: false };
  if (parseLocationMessage(raw)) return { icon: TYPE_ICONS.location, text: "Localização", mine: false, status: null, italic: false, isNew: false };
  return { icon: null, text: String(raw), mine: false, status: null, italic: false, isNew: false };
}

const normalizar = (texto = "") =>
  String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function ListTicks({ status }) {
  const { colors } = useTheme();
  if (status === "read") {
    return <Ionicons name="checkmark-done" size={16} color={colors.readTickOnSurface} accessibilityLabel="Visualizada" />;
  }
  if (status === "delivered") {
    return <Ionicons name="checkmark-done" size={16} color={colors.textTertiary} accessibilityLabel="Entregue" />;
  }
  return <Ionicons name="checkmark" size={16} color={colors.textTertiary} accessibilityLabel="Enviada" />;
}

function ConversationItem({ conversation, onPress, onLongPress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const preview = conversationPreview(conversation);
  const unread = Number(conversation.unreadCount) || 0;
  const time = formatListTime(conversation.timestamp);

  return (
    <Pressable
      testID={`conversation-${conversation.id}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      onLongPress={() => {
        tapLight();
        onLongPress();
      }}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversa com ${conversation.name}${unread ? `, ${unread} não lidas` : ""}`}
      accessibilityHint="Segure para mais opções"
      // Leitores de tela oferecem "Mais opções" no menu de ações da linha
      // (o toque longo não é óbvio para quem navega pelo TalkBack/VoiceOver).
      accessibilityActions={[
        { name: "activate", label: `Abrir conversa com ${conversation.name}` },
        { name: "longpress", label: `Mais opções da conversa com ${conversation.name}` },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "longpress") onLongPress();
        else onPress();
      }}
    >
      <Avatar uri={conversation.avatar ?? conversation.img} name={conversation.name} size={52} />

      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{time}</Text>
        </View>

        <View style={styles.line}>
          <View style={styles.previewRow}>
            {preview.mine && preview.status ? <ListTicks status={preview.status} /> : null}
            {preview.icon ? <Ionicons name={preview.icon} size={15} color={colors.textSecondary} /> : null}
            <Text
              style={[
                styles.preview,
                preview.italic && styles.previewItalic,
                preview.isNew && styles.previewNew,
                unread > 0 && styles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {preview.text}
            </Text>
          </View>
          {unread > 0 ? (
            <View style={styles.badge} testID={`conversation-unread-${conversation.id}`}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Matches({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const refreshTimer = useRef(null);

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

  // Voltando do chat, a lista reflete o que mudou (prévia, ticks, não lidas).
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", () => loadConversations(true));
    return unsubscribe;
  }, [navigation, loadConversations]);

  // T045 — lista viva: novo match, nova mensagem ou mudança de ticks
  // atualizam a lista sem o usuário precisar puxar para recarregar.
  useEffect(() => {
    const refresh = () => loadConversations(true);
    // Vários eventos seguidos (ex.: ticks de várias mensagens) viram 1 recarga.
    const refreshSoon = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(refresh, 400);
    };
    const offMatch = onSocketEvent(SOCKET_EVENTS.NEW_MATCH, refresh);
    const offNotification = onSocketEvent(SOCKET_EVENTS.NOTIFICATION, refresh);
    const offStatus = onSocketEvent(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, refreshSoon);
    return () => {
      offMatch();
      offNotification();
      offStatus();
      clearTimeout(refreshTimer.current);
    };
  }, [loadConversations]);

  const visible = useMemo(() => {
    const termo = normalizar(query);
    if (!termo) return conversations;
    return conversations.filter((c) => normalizar(c.name).includes(termo));
  }, [conversations, query]);

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
                "Match desfeito",
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

  const sheetOptions = selected
    ? [
        { key: "open", testID: "conversation-action-open", label: "Abrir conversa", icon: "chatbubble-outline", onPress: () => openConversation(selected) },
        { key: "unmatch", testID: "conversation-action-unmatch", label: "Desfazer match", icon: "heart-dislike-outline", destructive: true, onPress: () => handleUnmatch(selected) },
      ]
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Conversas</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput
            testID="conversations-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            selectionColor={colors.primary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Pesquisar conversas"
          />
          {query ? (
            <Pressable
              testID="conversations-search-clear"
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Limpar pesquisa"
            >
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading} testID="conversations-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          testID="conversations-list"
          data={visible}
          keyExtractor={(conversation) => String(conversation.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => openConversation(item)}
              onLongPress={() => setSelected(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.listContent, visible.length === 0 && styles.emptyListContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              tintColor={colors.accent}
              colors={[colors.primary]}
              accessibilityLabel="Atualizar conversas"
            />
          }
          ListEmptyComponent={
            query ? (
              <View style={styles.emptyState} testID="conversations-search-empty">
                <Text style={styles.emptyTitle}>Nenhuma conversa encontrada</Text>
                <Text style={styles.emptySubtitle}>Não há ninguém com “{query}” nas suas conversas.</Text>
              </View>
            ) : (
              <View style={styles.emptyState} testID="conversations-empty">
                <View style={styles.emptyBadge}>
                  <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Você ainda não tem matches</Text>
                <Text style={styles.emptySubtitle}>
                  Curtir perfis no Descobrir é o primeiro passo para começar a conversar por aqui.
                </Text>
                <Pressable
                  testID="btn-go-to-discovery"
                  style={({ pressed }) => [styles.emptyCTA, pressed && { backgroundColor: colors.primaryPressed }]}
                  onPress={() => navigation?.navigate?.("Discovery")}
                  accessibilityRole="button"
                  accessibilityLabel="Ir para Descobrir"
                >
                  <Text style={styles.emptyCTAText}>Descobrir perfis</Text>
                </Pressable>
              </View>
            )
          }
        />
      )}

      <ActionSheet
        testID="conversation-sheet"
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        options={sheetOptions}
      />
    </SafeAreaView>
  );
}

const AVATAR = 52;

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
    },
    searchWrap: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    search: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 8,
      height: 40,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingBottom: spacing.lg,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    // Divisória começa depois do avatar, como no WhatsApp.
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginLeft: spacing.md + AVATAR + 12,
    },
    body: {
      flex: 1,
      rowGap: 3,
    },
    line: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 8,
    },
    name: {
      flex: 1,
      ...typography.bodyStrong,
      fontSize: 16,
      color: colors.textPrimary,
    },
    time: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    timeUnread: {
      color: colors.accent,
      fontWeight: "600",
    },
    previewRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      columnGap: 4,
    },
    preview: {
      flex: 1,
      ...typography.body,
      fontSize: 14,
      color: colors.textSecondary,
    },
    previewItalic: {
      fontStyle: "italic",
    },
    previewNew: {
      color: colors.accent,
    },
    previewUnread: {
      color: colors.textPrimary,
    },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    emptyState: {
      alignItems: "center",
      paddingHorizontal: spacing.xl,
    },
    emptyBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    emptySubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    emptyCTA: {
      marginTop: spacing.lg,
      minHeight: 46,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyCTAText: {
      ...typography.bodyStrong,
      color: colors.onPrimary,
    },
  });
