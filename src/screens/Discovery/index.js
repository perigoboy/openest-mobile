// Discovery — integração do Discovery Engine (T030), no visual do tema
// claro/escuro (sem o fundo em degradê nem os botões de vidro):
// o baralho vem de GET /api/users/buscar (serviço src/services/discovery.js),
// que já respeita os filtros do backend e exclui perfis já interagidos.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, DiscoveryCard, Loader } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { DEFAULT_PREFERENCES, loadPreferences } from "../../services/searchPreferences";
import { avatarFallback, fetchCompatibleProfiles } from "../../services/discovery";
import { likeProfile } from "../../services/interactions";
import { distanceKm } from "../../services/userLocation";
import { fetchMyProfile } from "../../services/profile";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { REPORT_REASONS, submitReport } from "../../services/moderation";
import { blockUser } from "../../services/block";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { radius, spacing, typography } from "../../styles/theme";
import { tapLight, tapMedium } from "../../utils/haptics";

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, updateUser } = useAuth();
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
  const [liking, setLiking] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);
  const isLiking = useRef(false);
  const userPhoto = Array.isArray(user?.photos)
    ? user.photos.find((photo) => typeof photo === "string" && photo.startsWith("http"))
    : null;
  // Foto principal do usuário logado (Cloudinary) para o avatar do topo.
  // Sem foto → o Avatar mostra as iniciais do nome (nunca foto de teste fixa).
  const myAvatarUri =
    resolveMediaUrl(userPhoto || (typeof user?.foto_url === "string" ? user.foto_url : null)) || undefined;
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

  // Hidrata o contexto com o perfil real (foto do Cloudinary) ao abrir a
  // Descoberta, para o avatar do topo não depender de visitar o Perfil antes.
  useEffect(() => {
    let active = true;
    fetchMyProfile()
      .then((data) => {
        if (!active || !data) return;
        const photos = Array.isArray(data.photos) ? data.photos : [];
        updateUser?.({ name: data.name, foto_url: data.foto_url, photos });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [updateUser]);

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

  const handleLike = useCallback(async () => {
    if (!profile || isLiking.current) return;

    isLiking.current = true;
    setLiking(true);
    try {
      const isMatch = await likeProfile(profile.id);
      if (isMatch) {
        setMatchProfile(profile);
      } else {
        next();
      }
    } catch (error) {
      console.error("Erro ao registrar curtida:", error?.response?.status, error?.response?.data || error?.message);
      Alert.alert("Não foi possível curtir", "Tente novamente em instantes.");
      next();
    } finally {
      isLiking.current = false;
      setLiking(false);
    }
  }, [profile]);

  function handleCardSwipe(direction) {
    if (isLiking.current) return;
    if (direction === "like") {
      return handleLike();
    } else {
      next();
    }
  }

  function dismissMatch() {
    setMatchProfile(null);
    next();
  }

  function openMatchChat() {
    if (navigation && typeof navigation.navigate === "function" && matchProfile) {
      navigation.navigate("Chat", { contact: matchProfile });
    }
    dismissMatch();
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

  // T037 — Bloquear usuário: dispara POST /api/bloquear e remove o perfil
  // do baralho local imediatamente (critério de aceite: não aparece mais em
  // nenhuma tela do app).
  async function handleBlockUser(targetProfile) {
    try {
      await blockUser(targetProfile.id);
      hiddenProfileIds.current.add(targetProfile.id);
      setDeck((currentDeck) => [...currentDeck]);
      Alert.alert(
        "Usuário bloqueado",
        "Este perfil não será mais exibido para você."
      );
    } catch (error) {
      console.error("Erro ao bloquear usuário:", error);
      Alert.alert(
        "Não foi possível bloquear",
        error?.response?.data?.error || "Tente novamente em alguns instantes."
      );
    }
  }

  return (
    <View style={styles.bg}>
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
            <Avatar uri={myAvatarUri} name={user?.name} size={38} />
          </TouchableOpacity>
          <View style={styles.brandCenter} pointerEvents="none">
            <Image testID="discovery-brand" source={require("../../../assets/logo-chama.png")} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <View style={styles.topRight}>
            <TouchableOpacity
              testID="btn-encontros"
              style={styles.iconButton}
              onPress={() => navigation?.navigate?.("Encontros")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Abrir meus encontros"
            >
              <Ionicons name="calendar-outline" size={19} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-filters"
              style={styles.pill}
              onPress={openFilters}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Abrir filtros de busca"
            >
              <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.pillText} numberOfLines={1}>{shortFilterLabel(prefs)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardArea}>
          {loading ? (
            // T030: loader inline enquanto a API responde.
            <Loader />
          ) : profile ? (
            <DiscoveryCard
              profile={profile}
              onSwipe={handleCardSwipe}
              onReportPress={() => openReportModal(profile)}
              onBlockPress={() => handleBlockUser(profile)}
            />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Ionicons name={deck.length === 0 ? "options-outline" : "sparkles-outline"} size={26} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {deck.length === 0 ? "Nenhum perfil nos filtros atuais" : "Você viu todo mundo"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {deck.length === 0
                  ? "Ajuste a distância, a idade ou o grupo para ver mais pessoas."
                  : "Volte aos filtros para ampliar a busca."}
              </Text>
              {deck.length === 0 ? (
                <TouchableOpacity accessibilityRole="button" testID="btn-open-filters" style={styles.restart} onPress={openFilters}>
                  <Text style={styles.restartText}>Ajustar filtros</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity accessibilityRole="button" testID="btn-restart" style={styles.restart} onPress={() => setIndex(0)}>
                  <Text style={styles.restartText}>Ver de novo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Ações: passar / super like / curtir (com feedback tátil) */}
        <View style={styles.actions}>
          <TouchableOpacity
            testID="btn-pass"
            style={[styles.actionButton, styles.actionSecondary]}
            onPress={() => {
              tapLight();
              next();
            }}
            disabled={liking}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Passar perfil"
          >
            <Ionicons name="close" size={30} color={colors.dangerText} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn-superlike"
            style={[styles.actionButton, styles.actionSmall]}
            onPress={() => {
              tapLight();
              next();
            }}
            disabled={liking}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Super like"
          >
            <Ionicons name="star" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn-like"
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={() => {
              tapMedium();
              handleLike();
            }}
            disabled={liking}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Curtir perfil"
          >
            <Ionicons name="heart" size={30} color={colors.onPrimary} />
          </TouchableOpacity>
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
                        color={selected ? colors.accent : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TextInput
                testID="report-description"
                style={styles.reportDescription}
                placeholder="Detalhes adicionais (opcional)"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
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
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reportSubmitText}>Enviar denúncia</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
      <Modal
        visible={Boolean(matchProfile)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissMatch}
      >
        <View style={styles.matchOverlay}>
          <View style={styles.matchModal} accessibilityViewIsModal>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>
              Você e {matchProfile?.name} curtiram um ao outro.
            </Text>
            <View style={styles.matchPhotos}>
              <Image
                testID="match-modal-user-photo"
                source={{
                  uri:
                    userPhoto ||
                    (typeof user?.foto_url === "string" && user.foto_url.startsWith("http")
                      ? user.foto_url
                      : avatarFallback(user?.name)),
                }}
                style={styles.matchPhoto}
              />
              <View style={styles.matchHeart}>
                <Ionicons name="heart" size={20} color={colors.onPrimary} />
              </View>
              <Image
                testID="match-modal-profile-photo"
                source={{ uri: matchProfile?.photo || avatarFallback(matchProfile?.name) }}
                style={styles.matchPhoto}
              />
            </View>
            <TouchableOpacity
              testID="btn-match-chat"
              style={styles.matchChatButton}
              onPress={openMatchChat}
              accessibilityRole="button"
            >
              <Text style={styles.matchChatText}>Enviar primeira mensagem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-match-continue"
              style={styles.matchContinueButton}
              onPress={dismissMatch}
              accessibilityRole="button"
            >
              <Text style={styles.matchContinueText}>Continuar descobrindo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1, paddingHorizontal: spacing.md },
    topBar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, position: "relative" },
    avatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", zIndex: 2 },
    brandCenter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 1 },
    brandLogo: { width: 64, height: 42 },
    topRight: { flexDirection: "row", alignItems: "center", columnGap: 8, zIndex: 2 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 6,
      maxWidth: 132,
      height: 40,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexShrink: 1,
    },
    pillText: { ...typography.label, fontSize: 12, color: colors.textPrimary, flexShrink: 1 },
    cardArea: { flex: 1, justifyContent: "center", paddingVertical: 10, overflow: "hidden" },
    empty: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: "center",
      rowGap: 8,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    emptyBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      marginBottom: 4,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: "center" },
    emptySubtitle: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
    restart: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 20, height: 42, justifyContent: "center", borderRadius: radius.pill },
    restartText: { ...typography.label, color: colors.onPrimary },
    // A barra inferior é fixa agora: basta um respiro normal embaixo.
    actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 20, marginTop: 6, paddingBottom: spacing.md },
    actionButton: {
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colors.scheme === "dark" ? 0.4 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    actionSecondary: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    actionSmall: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    actionPrimary: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.primary,
    },
    matchOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.lg },
    matchModal: {
      width: "100%",
      maxWidth: 380,
      alignItems: "center",
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    matchTitle: { ...typography.h1, fontSize: 28, color: colors.accent, textAlign: "center" },
    matchSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: 6 },
    matchPhotos: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: spacing.lg },
    matchPhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.surfaceElevated, backgroundColor: colors.surfaceMuted },
    matchHeart: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginHorizontal: -10,
      zIndex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.surfaceElevated,
    },
    matchChatButton: { width: "100%", backgroundColor: colors.primary, borderRadius: radius.pill, height: 50, justifyContent: "center", alignItems: "center" },
    matchChatText: { ...typography.bodyStrong, color: colors.onPrimary },
    matchContinueButton: { paddingVertical: 14 },
    matchContinueText: { ...typography.label, fontSize: 14, color: colors.accent },
    reportOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.overlay,
    },
    reportSheet: {
      maxHeight: "88%",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: colors.surfaceElevated,
    },
    reportHandle: {
      width: 36,
      height: 4,
      alignSelf: "center",
      marginBottom: spacing.md,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    reportTitle: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    reportSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
    },
    reportReasonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    reportReasonText: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
      marginRight: spacing.sm,
    },
    reportReasonTextSelected: {
      color: colors.accent,
      fontWeight: "600",
    },
    reportDescription: {
      minHeight: 72,
      maxHeight: 112,
      padding: spacing.md,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.inputBg,
      color: colors.textPrimary,
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
      ...typography.bodyStrong,
      color: colors.textSecondary,
    },
    reportSubmit: {
      minHeight: 48,
      minWidth: 148,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.dangerDark,
    },
    reportSubmitDisabled: {
      opacity: 0.5,
    },
    reportSubmitText: {
      ...typography.bodyStrong,
      color: "#FFFFFF",
    },
  });
