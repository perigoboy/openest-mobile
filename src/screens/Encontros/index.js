// Encontros — matches e encontros marcados (espelha a /events do web).
// Cards com foto (Cloudinary), selo de status, data/hora e local, e as ações
// Abrir chat, Salvar na agenda e Desistir. Acompanha o tema claro/escuro.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components";
import { cancelEncontro, fetchMatches } from "../../services/match";
import { onSocketEvent } from "../../services/socket";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { radius, spacing, typography } from "../../styles/theme";

function StatusBadge({ status }) {
  const styles = useThemedStyles(createStyles);
  const agendado = status === "Agendado";
  return (
    <View style={[styles.badge, agendado ? styles.badgeConfirmed : styles.badgePending]}>
      <Text style={[styles.badgeText, agendado ? styles.badgeTextConfirmed : styles.badgeTextPending]}>
        {status}
      </Text>
    </View>
  );
}

function Detail({ icon, text }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!text) return null;
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Text style={styles.detailText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function EventCard({ item, onOpenChat, onGoogle, onDesistir }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card} testID={`match-${item.id}`}>
      <View style={styles.cardTop}>
        <Avatar uri={item.photo || undefined} name={item.name} size={48} />
        <View style={styles.cardHeading}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.titulo && item.titulo !== item.name ? (
            <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.details}>
        <Detail icon="time-outline" text={item.dateTime || (item.status === "A combinar" ? "A combinar" : null)} />
        <Detail icon="location-outline" text={item.local} />
      </View>

      <View style={styles.actions}>
        <Pressable
          testID={`match-chat-${item.id}`}
          style={({ pressed }) => [styles.actionBtn, styles.chatBtn, pressed && { backgroundColor: colors.primaryPressed }]}
          onPress={() => onOpenChat(item)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir conversa com ${item.name}`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.onPrimary} />
          <Text style={styles.chatBtnText}>Abrir chat</Text>
        </Pressable>

        {item.googleUrl ? (
          <Pressable
            testID={`match-google-${item.id}`}
            style={({ pressed }) => [styles.actionBtn, styles.outlineBtn, pressed && styles.pressedSoft]}
            onPress={() => onGoogle(item)}
            accessibilityRole="button"
            accessibilityLabel="Salvar no Google Agenda"
          >
            <Ionicons name="calendar-outline" size={16} color={colors.accent} />
            <Text style={styles.outlineBtnText}>Agenda</Text>
          </Pressable>
        ) : null}

        <Pressable
          testID={`match-desistir-${item.id}`}
          style={({ pressed }) => [styles.actionBtn, styles.ghostBtn, pressed && styles.pressedSoft]}
          onPress={() => onDesistir(item)}
          accessibilityRole="button"
          accessibilityLabel={`Desistir do encontro com ${item.name}`}
        >
          <Text style={styles.desistirText}>Desistir</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Encontros({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetchMatches();
      setMatches(result || []);
    } catch (error) {
      console.error("Erro ao carregar encontros:", error);
      Alert.alert("Erro", "Não foi possível carregar seus encontros.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const unsubscribe = navigation?.addListener?.("focus", () => loadMatches(true));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMatches]);

  // Se o outro lado desistir enquanto esta tela está aberta, some na hora.
  useEffect(() => {
    const off = onSocketEvent("encontro_cancelado", () => loadMatches(true));
    return off;
  }, [loadMatches]);

  const openChat = useCallback(
    (item) => {
      if (item?.conversationId != null) {
        navigation?.navigate?.("Chat", {
          conversationId: item.conversationId,
          contact: { name: item.name, avatar: item.photo },
        });
      } else {
        Alert.alert("Conversa indisponível", "Ainda não há uma conversa para este encontro.");
      }
    },
    [navigation]
  );

  const openGoogle = useCallback((item) => {
    if (item?.googleUrl) Linking.openURL(item.googleUrl);
  }, []);

  const handleDesistir = useCallback((item) => {
    Alert.alert(
      "Desistir do encontro",
      `Remover o encontro com ${item.name} da sua lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desistir",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelEncontro(item);
              setMatches((prev) => prev.filter((m) => m.id !== item.id));
            } catch (error) {
              console.error("Erro ao desistir do encontro:", error);
              Alert.alert("Erro", "Não foi possível remover este encontro.");
            }
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Encontros</Text>
        <Text style={styles.subtitle}>Matches e encontros marcados</Text>
      </View>

      {loading ? (
        <View style={styles.loading} testID="encontros-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          testID="encontros-list"
          data={matches}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EventCard item={item} onOpenChat={openChat} onGoogle={openGoogle} onDesistir={handleDesistir} />
          )}
          contentContainerStyle={[styles.listContent, matches.length === 0 && styles.emptyListContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMatches(true)}
              tintColor={colors.accent}
              colors={[colors.primary]}
              accessibilityLabel="Atualizar encontros"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState} testID="encontros-empty">
              <View style={styles.emptyBadge}>
                <Ionicons name="calendar-outline" size={28} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>Você ainda não tem encontros</Text>
              <Text style={styles.emptySubtitle}>
                Curtir perfis no Descobrir é o primeiro passo para marcar encontros por aqui.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    title: { ...typography.h1, color: colors.textPrimary },
    subtitle: { ...typography.body, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    // A barra inferior agora faz parte do layout: basta um respiro normal.
    listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.lg },
    emptyListContent: { flexGrow: 1, justifyContent: "center" },
    emptyState: { alignItems: "center", paddingHorizontal: spacing.xl },
    emptyBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: "center", marginTop: spacing.md },
    emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardTop: { flexDirection: "row", alignItems: "center", columnGap: 12 },
    cardHeading: { flex: 1 },
    name: { ...typography.bodyStrong, fontSize: 16, color: colors.textPrimary },
    titulo: { ...typography.caption, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    badgeConfirmed: { backgroundColor: colors.successSoft },
    badgePending: { backgroundColor: colors.primarySoft },
    badgeText: { fontSize: 12, fontWeight: "600" },
    badgeTextConfirmed: { color: colors.successText },
    badgeTextPending: { color: colors.accent },

    details: { marginTop: 12, rowGap: 6 },
    detail: { flexDirection: "row", alignItems: "center", columnGap: 8 },
    detailText: { ...typography.body, fontSize: 14, color: colors.textPrimary, flexShrink: 1 },

    actions: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.sm,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      columnGap: 6,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
    },
    chatBtn: { flex: 1, backgroundColor: colors.primary },
    chatBtnText: { ...typography.label, color: colors.onPrimary },
    outlineBtn: { borderWidth: 1, borderColor: colors.border },
    outlineBtnText: { ...typography.label, color: colors.accent },
    ghostBtn: { paddingHorizontal: 10 },
    desistirText: { ...typography.label, color: colors.dangerText },
    pressedSoft: { backgroundColor: colors.surfaceMuted },
  });
