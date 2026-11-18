// Encontros — T047: Tela de eventos e encontros
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
import { cancelEncontro, fetchMatches } from "../../services/match";
import { colors, radius, spacing, typography } from "../../styles/theme";

function MatchItem({ match, onDesistir, onPress }) {
  return (
    <TouchableOpacity
      testID={`match-${match.id}`}
      style={styles.matchItem}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes do match ${match.id}`}
    >
      <View style={styles.matchContainer}>
        <Avatar uri={match.photo || undefined} name={match.name} size={48} />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName} numberOfLines={1}>
            {match.name}
          </Text>
          <Text style={styles.matchInfoText} numberOfLines={1}>
            {match.subtitle}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        testID={`match-desistir-${match.id}`}
        style={styles.desistirButton}
        onPress={() => onDesistir(match)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Desistir do encontro com ${match.name}`}
      >
        <Text style={styles.desistirText}>Desistir</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function Encontros({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
  }, [loadMatches]);

  const openChat = useCallback(
    (item) => {
      if (item?.conversationId != null) {
        navigation?.navigate?.("Chat", {
          conversationId: item.conversationId,
          contact: { name: item.name, avatar: item.photo },
        });
      }
    },
    [navigation]
  );

  const handleDesistir = useCallback(async (item) => {
    try {
      await cancelEncontro(item);
      setMatches((prev) => prev.filter((m) => m.id !== item.id));
      Alert.alert("Pronto", "Encontro removido da sua lista.");
    } catch (error) {
      console.error("Erro ao desistir do encontro:", error);
      Alert.alert("Erro", "Não foi possível remover este encontro.");
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Encontros</Text>
        <Text style={styles.subtitle}>Seus encontros e matches disponíveis</Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id || String(item)}
        renderItem={({ item }) => (
          <MatchItem match={item} onDesistir={handleDesistir} onPress={() => openChat(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
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
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Você ainda não tem encontros</Text>
            <Text style={styles.emptySubtitle}>
              Curtir perfis no Descobrir é o primeiro passo para começar a encontrar
              pessoas por aqui.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
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
  matchItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  matchContainer: { flexDirection: "row", alignItems: "center" },
  matchName: {
    ...typography.h3,
    flex: 1,
    color: colors.text,
    marginRight: spacing.sm,
  },
  matchInfoText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  desistirButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  desistirText: {
    ...typography.caption,
    color: "#EF4444",
    fontWeight: "600",
  },
});