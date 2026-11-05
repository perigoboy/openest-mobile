// Discovery — redesign liquid glass + integração do Discovery Engine (T030):
// o baralho vem de GET /api/users/buscar (serviço src/services/discovery.js),
// que já respeita os filtros do backend e exclui perfis já interagidos.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { DiscoveryCard, Loader } from "../../components";
import { DEFAULT_PREFERENCES, loadPreferences } from "../../services/searchPreferences";
import { fetchCompatibleProfiles } from "../../services/discovery";
import { distanceKm } from "../../services/userLocation";
import { REPORT_REASONS, submitReport } from "../../services/moderation";
import { colors, radius, spacing, typography } from "../../styles/theme";

function distanceToKm(profile, userLocation) {
  if (profile?.latitude != null && profile?.longitude != null && userLocation) {
    const km = distanceKm(userLocation, { latitude: profile.latitude, longitude: profile.longitude });
    if (Number.isFinite(km)) return km;
  }
  const raw = String(profile?.distance || "").replace(",", ".");
  const match = raw.match(/([\d.]+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function matchesGender(profile, gender) {
  if (!gender || gender === "all") return true;
  if (gender === "women") return profile.kind === "single";
  if (gender === "men") return profile.kind === "single";
  if (gender === "couples") return profile.kind === "couple";
  if (gender === "groups") return profile.kind === "group";
  return true;
}

export function applyPreferences(profiles, prefs, userLocation) {
  const active = { ...DEFAULT_PREFERENCES, ...(prefs || {}) };
  return (profiles || []).filter((p) => {
    const age = Number(p.age);
    if (!Number.isFinite(age) || age < active.minAge || age > active.maxAge) return false;
    if (distanceToKm(p, userLocation) > active.maxDistanceKm) return false;
    return matchesGender(p, active.gender);
  });
}

function shortFilterLabel(prefs) {
  if (prefs.gender !== "all" || prefs.minAge !== 18 || prefs.maxAge !== 35) return "Filtros";
  if (prefs.maxDistanceKm < 500) return `${String(prefs.maxDistanceKm).replace(".", ",")} km`;
  return "Perto de mim";
}

export default function Discovery({ navigation }) {
  const [index, setIndex] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState(null);
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const hiddenProfileIds = useRef(new Set());
  // T030 — baralho vindo da API (Discovery Engine). O backend já aplica os
  // filtros de idade/status/interesses e exclui perfis já interagidos.
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const visibleDeck = deck.filter(
    (item) => !hiddenProfileIds.current.has(item.id)
  );
  const profile = visibleDeck[index] || null;

  // Busca os perfis compatíveis na API e reseta o baralho para o 1º card.
  const loadProfiles = useCallback(async (currentPrefs) => {
    setLoading(true);
    try {
      const { profiles } = await fetchCompatibleProfiles(currentPrefs);
      setDeck(profiles.filter((item) => !hiddenProfileIds.current.has(item.id)));
      setIndex(0);
    } catch (error) {
      console.error("Erro ao buscar perfis compatíveis:", error?.response?.status, error?.response?.data || error?.message);
      setDeck([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadPreferences();
      if (!mounted) return;
      setPrefs(saved);
      loadProfiles(saved);
    })();
    // Recarrega ao voltar dos Filtros (quando hÃ¡ listener de foco).
    const unsubscribe =
      navigation && typeof navigation.addListener === "function"
        ? navigation.addListener("focus", async () => {
            const saved = await loadPreferences();
            if (mounted) {
              setPrefs(saved);
              loadProfiles(saved);
            }
          })
        : undefined;
    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [loadProfiles]);

  function openFilters() {
    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("SearchPreferences", {
        initial: prefs,
        onApply: (clean) => {
          setPrefs(clean);
          loadProfiles(clean);
        },
      });
    }
  }

  // Avatar do próprio usuário (topo) → tela de Configurações (tab "Settings").
  function openSettings() {
    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("Settings");
    }
  }

  function next() {
    setIndex((i) => i + 1);
  }

  // T032 — o gesto de swipe do card aciona a MESMA lógica dos botões Like/Pass
  // (hoje ambos avançam o baralho via next()); `direction` fica documentado
  // para o T038 separar os efeitos de curtir/passar.
  function handleCardSwipe(direction) {
    next();
  }

  function openReportModal(targetProfile) {
    setReportTarget(targetProfile);
    setReportReason(null);
    setReportDescription("");
  }

  function closeReportModal() {
    if (submittingReport) return;
    setReportTarget(null);
    setReportReason(null);
    setReportDescription("");
  }

  async function handleSubmitReport() {
    if (!reportTarget || !reportReason || submittingReport) return;

    setSubmittingReport(true);
    try {
      await submitReport(
        reportTarget.id,
        reportReason,
        reportDescription.trim()
      );

      hiddenProfileIds.current.add(reportTarget.id);
      setDeck((currentDeck) => [...currentDeck]);
      setReportTarget(null);
      setReportReason(null);
      setReportDescription("");
      Alert.alert(
        "Denúncia enviada",
        "Obrigado por nos avisar. Este perfil não será mais exibido para você."
      );
    } catch (error) {
      console.error(
        "Erro ao enviar denúncia:",
        error?.response?.status,
        error?.response?.data || error?.message
      );
      Alert.alert(
        "Não foi possível denunciar",
        error?.response?.data?.error ||
          "Tente novamente em alguns instantes."
      );
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <LinearGradient colors={["#3D0A7A", "#8B3BD6", "#E3BFFF", "#F9F1FF"]} locations={[0, 0.4, 0.75, 1]} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="btn-my-avatar"
            style={styles.avatarRing}
            onPress={openSettings}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações"
          >
            <Image source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" }} style={styles.avatar} />
          </TouchableOpacity>
          <View style={styles.brandCenter} pointerEvents="none">
            <Image testID="discovery-brand" source={require("../../../assets/logo-chama.png")} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <TouchableOpacity testID="btn-filters" onPress={openFilters} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Abrir filtros de busca">
            <BlurView intensity={55} tint="dark" style={styles.pill}>
              <Ionicons name="options" size={16} color="#fff" />
              <Text style={styles.pillText} numberOfLines={1}>{shortFilterLabel(prefs)}</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.cardArea}>
          {loading ? (
            // T030: loader inline enquanto a API responde (a T031 evolui para
            // skeleton + estado vazio com recarregar).
            <Loader />
          ) : profile ? (
            <DiscoveryCard
              profile={profile}
              onSwipe={handleCardSwipe}
              onReportPress={() => openReportModal(profile)}
            />
          ) : (
            <BlurView intensity={40} tint="light" style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {deck.length === 0 ? "Nenhum perfil nos filtros atuais" : "Você viu todo mundo"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {deck.length === 0
                  ? "Ajuste a distÃ¢ncia, a idade ou o grupo para ver mais pessoas."
                  : "Volte aos filtros para ampliar a busca."}
              </Text>
              {deck.length === 0 ? (
                <TouchableOpacity testID="btn-open-filters" style={styles.restart} onPress={openFilters}>
                  <Text style={styles.restartText}>Ajustar filtros</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity testID="btn-restart" style={styles.restart} onPress={() => setIndex(0)}>
                  <Text style={styles.restartText}>Ver de novo</Text>
                </TouchableOpacity>
              )}
            </BlurView>
          )}
        </View>
        <View style={styles.actions}>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.pass]}>
            <TouchableOpacity testID="btn-pass" style={styles.hit} onPress={next} accessibilityRole="button" accessibilityLabel="Passar perfil">
              <Ionicons name="close" size={32} color="#7B1FCF" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.super, styles.small]}>
            <TouchableOpacity testID="btn-superlike" style={styles.hit} onPress={next} accessibilityRole="button" accessibilityLabel="Super like">
              <Ionicons name="star" size={20} color="#2D9CDB" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.like]}>
            <TouchableOpacity testID="btn-like" style={styles.hit} onPress={next} accessibilityRole="button" accessibilityLabel="Curtir perfil">
              <Ionicons name="heart" size={30} color="#12B76A" />
            </TouchableOpacity>
          </BlurView>
        </View>
        <Modal
          visible={Boolean(reportTarget)}
          transparent
          animationType="slide"
          onRequestClose={closeReportModal}
        >
          <View style={styles.reportOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeReportModal}
              accessibilityLabel="Fechar denúncia"
              accessibilityRole="button"
            />
            <View style={styles.reportSheet}>
              <View style={styles.reportHandle} />
              <Text style={styles.reportTitle}>
                Denunciar {reportTarget?.name}
              </Text>
              <Text style={styles.reportSubtitle}>
                Selecione o motivo que melhor descreve o problema.
              </Text>
              <ScrollView
                style={styles.reportReasons}
                keyboardShouldPersistTaps="handled"
              >
                {REPORT_REASONS.map((reason) => {
                  const selected = reportReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      testID={`report-reason-${REPORT_REASONS.indexOf(reason)}`}
                      style={[
                        styles.reportReason,
                        selected && styles.reportReasonSelected,
                      ]}
                      onPress={() => setReportReason(reason)}
                      activeOpacity={0.75}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.reportReasonText,
                          selected && styles.reportReasonTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TextInput
                testID="report-description"
                style={styles.reportDescription}
                placeholder="Detalhes adicionais (opcional)"
                placeholderTextColor={colors.textMuted}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                editable={!submittingReport}
                accessibilityLabel="Detalhes adicionais da denúncia"
              />
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.reportCancel}
                  onPress={closeReportModal}
                  disabled={submittingReport}
                  accessibilityRole="button"
                >
                  <Text style={styles.reportCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="submit-report"
                  style={[
                    styles.reportSubmit,
                    (!reportReason || submittingReport) &&
                      styles.reportSubmitDisabled,
                  ]}
                  onPress={handleSubmitReport}
                  disabled={!reportReason || submittingReport}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  {submittingReport ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.reportSubmitText}>Enviar denúncia</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 18 },
  topBar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, position: "relative" },
  avatarRing: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.9)", padding: 2, zIndex: 2 },
  avatar: { width: "100%", height: "100%", borderRadius: 20 },
  brandCenter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 1 },
  brandLogo: { width: 72, height: 48 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 132, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.85)", backgroundColor: "rgba(42,10,85,0.45)", zIndex: 2, flexShrink: 1 },
  pillText: { fontSize: 12, fontWeight: "700", color: "#fff", flexShrink: 1 },
  cardArea: { flex: 1, justifyContent: "center", paddingVertical: 12, overflow: "hidden" },
  empty: { borderRadius: 28, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#2A0A55", textAlign: "center" },
  emptySubtitle: { fontSize: 14, color: "#5B5B66", textAlign: "center" },
  restart: { backgroundColor: "#6D1BC7", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  restartText: { color: "#fff", fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 8, paddingBottom: 136 },
  glass: { width: 72, height: 72, borderRadius: 36, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1.6, backgroundColor: "rgba(255,255,255,0.65)" },
  small: { width: 72, height: 72, borderRadius: 36 },
  pass: { borderColor: "#7B1FCF" },
  super: { borderColor: "#2D9CDB" },
  like: { borderColor: "#12B76A" },
  hit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  reportOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  reportSheet: {
    maxHeight: "88%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  reportHandle: {
    width: 40,
    height: 4,
    alignSelf: "center",
    marginBottom: spacing.md,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  reportTitle: {
    ...typography.h2,
    color: colors.text,
  },
  reportSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  reportReasons: {
    flexGrow: 0,
  },
  reportReason: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  reportReasonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  reportReasonText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    marginRight: spacing.sm,
  },
  reportReasonTextSelected: {
    color: colors.primaryLight,
  },
  reportDescription: {
    minHeight: 72,
    maxHeight: 112,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    ...typography.body,
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    columnGap: spacing.sm,
    marginTop: spacing.md,
  },
  reportCancel: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  reportCancelText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "600",
  },
  reportSubmit: {
    minHeight: 48,
    minWidth: 148,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  reportSubmitDisabled: {
    opacity: 0.5,
  },
  reportSubmitText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
});
