// Discovery — redesign liquid glass + integração do Discovery Engine (T030):
// o baralho vem de GET /api/users/buscar (serviço src/services/discovery.js),
// que já respeita os filtros do backend e exclui perfis já interagidos.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { DiscoveryCard, Loader } from "../../components";
import { useAuth } from "../../contexts/AuthContext";
import { DEFAULT_PREFERENCES, loadPreferences } from "../../services/searchPreferences";
import { avatarFallback, fetchCompatibleProfiles } from "../../services/discovery";
import { likeProfile } from "../../services/interactions";
import { distanceKm } from "../../services/userLocation";

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
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  // T030 — baralho vindo da API (Discovery Engine). O backend já aplica os
  // filtros de idade/status/interesses e exclui perfis já interagidos.
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);
  const isLiking = useRef(false);
  const profile = deck[index] || null;
  const userPhoto = Array.isArray(user?.photos)
    ? user.photos.find((photo) => typeof photo === "string" && photo.startsWith("http"))
    : null;

  // Busca os perfis compatíveis na API e reseta o baralho para o 1º card.
  const loadProfiles = useCallback(async (currentPrefs) => {
    setLoading(true);
    try {
      const { profiles } = await fetchCompatibleProfiles(currentPrefs);
      setDeck(profiles);
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
            <DiscoveryCard profile={profile} onSwipe={handleCardSwipe} />
          ) : (
            <BlurView intensity={40} tint="light" style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {deck.length === 0 ? "Nenhum perfil nos filtros atuais" : "VocÃª viu todo mundo"}
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
            <TouchableOpacity testID="btn-pass" style={styles.hit} onPress={next} disabled={liking} accessibilityRole="button" accessibilityLabel="Passar perfil">
              <Ionicons name="close" size={32} color="#7B1FCF" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.super, styles.small]}>
            <TouchableOpacity testID="btn-superlike" style={styles.hit} onPress={next} disabled={liking} accessibilityRole="button" accessibilityLabel="Super like">
              <Ionicons name="star" size={20} color="#2D9CDB" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.like]}>
            <TouchableOpacity testID="btn-like" style={styles.hit} onPress={handleLike} disabled={liking} accessibilityRole="button" accessibilityLabel="Curtir perfil">
              <Ionicons name="heart" size={30} color="#12B76A" />
            </TouchableOpacity>
          </BlurView>
        </View>
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
              <Ionicons name="heart" size={26} color="#E84683" style={styles.matchHeart} />
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
  matchOverlay: { flex: 1, backgroundColor: "rgba(25, 5, 48, 0.78)", alignItems: "center", justifyContent: "center", padding: 24 },
  matchModal: { width: "100%", maxWidth: 380, alignItems: "center", padding: 28, borderRadius: 28, backgroundColor: "#FFF9FF" },
  matchTitle: { color: "#6D1BC7", fontSize: 30, fontWeight: "900", textAlign: "center" },
  matchSubtitle: { color: "#5B5262", fontSize: 15, textAlign: "center", marginTop: 8 },
  matchPhotos: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 26 },
  matchPhoto: { width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: "#fff" },
  matchHeart: { marginHorizontal: -8, zIndex: 1 },
  matchChatButton: { width: "100%", backgroundColor: "#6D1BC7", borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  matchChatText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  matchContinueButton: { paddingVertical: 14 },
  matchContinueText: { color: "#6D1BC7", fontSize: 14, fontWeight: "700" },
});
