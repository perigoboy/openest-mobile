// Encontros — tela de encontros/eventos (espelha a /events do web).
// Front — redesign com cards ricos: foto (Cloudinary), badge de status, chips
// de Data/Hora e Local, e ações (Abrir Chat, Google Agenda, Desistir).
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../components";
import { cancelEncontro, fetchMatches } from "../../services/match";
import { colors, radius, spacing, typography } from "../../styles/theme";

function StatusBadge({ status }) {
  const agendado = status === "Agendado";
  return (
    <View style={[styles.badge, agendado ? styles.badgeConfirmed : styles.badgePending]}>
      <Text style={[styles.badgeText, agendado ? styles.badgeTextConfirmed : styles.badgeTextPending]}>
        {status}
      </Text>
    </View>
  );
}

function Chip({ icon, text }) {
  if (!text) return null;
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.primaryLight} />
      <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function EventCard({ item, onOpenChat, onGoogle, onDesistir }) {
  return (
    <View style={styles.card} testID={`match-${item.id}`}>
      <View style={styles.cardTop}>
        <Avatar uri={item.photo || undefined} name={item.name} size={52} />
        <View style={styles.cardHeading}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.titulo && item.titulo !== item.name ? (
            <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
          ) : null}
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.chips}>
        <Chip icon="time-outline" text={item.dateTime || (item.status === "A combinar" ? "A combinar" : null)} />
        <Chip icon="location-outline" text={item.local} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          testID={`match-chat-${item.id}`}
          style={[styles.actionBtn, styles.chatBtn]}
          onPress={() => onOpenChat(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Abrir conversa com ${item.name}`}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
          <Text style={styles.chatBtnText}>Abrir Chat</Text>
        </TouchableOpacity>

        {item.googleUrl ? (
          <TouchableOpacity
            testID={`match-google-${item.id}`}
            style={[styles.actionBtn, styles.googleBtn]}
            onPress={() => onGoogle(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Salvar no Google Agenda"
          >
            <Ionicons name="calendar" size={16} color={colors.primaryLight} />
            <Text style={styles.googleBtnText}>Agenda</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID={`match-desistir-${item.id}`}
          style={[styles.actionBtn, styles.desistirBtn]}
          onPress={() => onDesistir(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Desistir do encontro com ${item.name}`}
        >
          <Ionicons name="close" size={16} color={colors.danger} />
          <Text style={styles.desistirText}>Desistir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Encontros({ navigation }) {
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
      <LinearGradient colors={["#2A0A55", "#0D0D0F"]} style={styles.headerBg}>
        <Text style={styles.title}>Encontros 🔥</Text>
        <Text style={styles.subtitle}>Seus matches e encontros agendados</Text>
      </LinearGradient>

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
              tintColor={colors.primaryLight}
              colors={[colors.primary]}
              accessibilityLabel="Atualizar encontros"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState} testID="encontros-empty">
              <Ionicons name="heart-circle-outline" size={64} color={colors.textMuted} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBg: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    // Espaço para a tab bar flutuante não cobrir os botões do último card.
    paddingBottom: 180,
  },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.h3, color: colors.text, textAlign: "center", marginTop: spacing.md },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#2A0A55",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", columnGap: spacing.sm },
  cardHeading: { flex: 1 },
  name: { ...typography.h3, color: colors.text },
  titulo: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  badgeConfirmed: { backgroundColor: "rgba(46,204,113,0.15)", borderColor: colors.success },
  badgePending: { backgroundColor: "rgba(142,68,173,0.18)", borderColor: colors.primaryLight },
  badgeText: { ...typography.caption, fontSize: 11, fontWeight: "700" },
  badgeTextConfirmed: { color: colors.success },
  badgeTextPending: { color: colors.primaryLight },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    maxWidth: "100%",
  },
  chipText: { ...typography.caption, color: colors.text },

  actions: { flexDirection: "row", columnGap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  chatBtn: { flex: 1, backgroundColor: colors.primary },
  chatBtnText: { ...typography.caption, fontWeight: "700", color: colors.white },
  googleBtn: { borderWidth: 1, borderColor: colors.primaryLight, backgroundColor: "transparent" },
  googleBtnText: { ...typography.caption, fontWeight: "700", color: colors.primaryLight },
  desistirBtn: { borderWidth: 1, borderColor: colors.danger, backgroundColor: "transparent" },
  desistirText: { ...typography.caption, fontWeight: "700", color: colors.danger },
});
