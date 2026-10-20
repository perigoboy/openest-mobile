// Discovery — redesign liquid glass + integração do Discovery Engine (T030):
// o baralho vem de GET /api/users/buscar (serviço src/services/discovery.js),
// que já respeita os filtros do backend e exclui perfis já interagidos.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { DiscoveryCard, DiscoverySkeleton } from "../../components";
import { DEFAULT_PREFERENCES, loadPreferences } from "../../services/searchPreferences";
import { excludeSeenProfiles, fetchCompatibleProfiles, undoInteraction } from "../../services/discovery";
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
  const [index, setIndex] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  // T030 — baralho vindo da API (Discovery Engine). O backend já aplica os
  // filtros de idade/status/interesses e exclui perfis já interagidos.
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  // T031 — distingue "acabaram os perfis" de "a API falhou" no estado vazio.
  const [loadFailed, setLoadFailed] = useState(false);
  // T033 — cache local (em memória/sessão) dos IDs já avaliados no Discovery.
  // Set em ref: mutação não precisa re-render, o filtro acontece no load.
  const seenIdsRef = useRef(new Set());
  const profile = deck[index] || null;
  // T034 — último card avaliado + ação tomada (like/pass/superlike): alimenta
  // o botão "Desfazer" (undo de nível único, o último swipe apenas).
  const [lastAction, setLastAction] = useState(null);

  // Busca os perfis compatíveis na API e reseta o baralho para o 1º card.
  // IDs já vistos na sessão são filtrados aqui para não repetirem (T033).
  const loadProfiles = useCallback(async (currentPrefs) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const { profiles } = await fetchCompatibleProfiles(currentPrefs);
      setDeck(excludeSeenProfiles(profiles, seenIdsRef.current));
      setIndex(0);
    } catch (error) {
      console.error("Erro ao buscar perfis compatíveis:", error?.response?.status, error?.response?.data || error?.message);
      setDeck([]);
      setLoadFailed(true);
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

  function next(action = "pass") {
    const current = deck[index];
    if (!current) return;
    // T033 — avalia o card atual (like/pass/superlike): guarda o ID no cache
    // de vistos da sessão antes de avançar o baralho.
    if (current.id != null) seenIdsRef.current.add(current.id);
    // T034 — registra a ação para o desfazer.
    setLastAction({ profile: current, action });
    setIndex((i) => i + 1);
  }

  // T034 — desfazer o último swipe/avaliação.
  // A reversão no backend é fire-and-forget: o 404 significa que ainda não há
  // interação registrada no servidor (ex.: rede caiu na hora de registrar) e
  // falhas não impedem o restore local — a UI segue o estado local.
  function handleUndo() {
    if (!lastAction || loading) return;
    const undone = lastAction.profile;
    setLastAction(null);
    if (undone?.id != null) {
      undoInteraction(undone.id).catch((error) =>
        console.error(
          "Desfazer: reversão no servidor não confirmada:",
          error?.response?.status || error?.message
        )
      );
    }
    // Sai do cache de vistos e volta ao TOPO da pilha (index 0). O restante do
    // baralho fica só com os ainda não avaliados, preservando a continuidade.
    if (undone?.id != null) seenIdsRef.current.delete(undone.id);
    setDeck((prev) => {
      const rest = prev.filter((p) => p.id !== undone?.id);
      const unseen = rest.filter((p) => !seenIdsRef.current.has(p.id));
      return [undone, ...unseen];
    });
    setIndex(0);
  }

  // T032 — o gesto de swipe do card aciona a MESMA lógica dos botões Like/Pass,
  // registrando a direção avaliada (T034 guarda para o desfazer); o disparo
  // das curtidas/passagens à API fica para o T038 separar os efeitos.
  function handleCardSwipe(direction) {
    next(direction);
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
            // T031 — skeleton no layout do card enquanto a API responde: a
            // tela nunca fica em branco durante o carregamento.
            <DiscoverySkeleton />
          ) : profile ? (
            <DiscoveryCard profile={profile} onSwipe={handleCardSwipe} />
          ) : (
            <BlurView intensity={40} tint="light" style={styles.empty} testID="discovery-empty">
              <Ionicons
                name={loadFailed ? "cloud-offline-outline" : "sad-outline"}
                size={42}
                color="#6D1BC7"
              />
              <Text style={styles.emptyTitle} testID="empty-title">
                {loadFailed ? "Não foi possível carregar os perfis" : "Não há mais perfis por aqui"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {loadFailed
                  ? "Verifique sua conexão e tente novamente."
                  : "Volte mais tarde ou ajuste os filtros para ampliar a busca."}
              </Text>
              <TouchableOpacity
                testID="btn-reload"
                style={styles.restart}
                onPress={() => loadProfiles(prefs)}
                accessibilityRole="button"
                accessibilityLabel="Recarregar perfis"
              >
                <Text style={styles.restartText}>{loadFailed ? "Tentar novamente" : "Recarregar"}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="btn-open-filters" onPress={openFilters} accessibilityRole="button">
                <Text style={styles.emptyLink}>Ajustar filtros</Text>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>
        {lastAction && !loading && (
          // T034 — desfazer do último swipe: aparece após a primeira avaliação
          // e some depois de usado (undo de nível único).
          <View style={styles.undoRow}>
            <BlurView intensity={40} tint="light" style={[styles.glass, styles.undoGlass]}>
              <TouchableOpacity
                testID="btn-undo"
                style={styles.hit}
                onPress={handleUndo}
                accessibilityRole="button"
                accessibilityLabel="Desfazer último swipe"
              >
                <Ionicons name="arrow-undo" size={22} color="#6D1BC7" />
              </TouchableOpacity>
            </BlurView>
          </View>
        )}
        <View style={styles.actions}>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.pass, !profile && styles.glassDisabled]}>
            <TouchableOpacity testID="btn-pass" style={styles.hit} onPress={() => next("pass")} disabled={!profile} accessibilityRole="button" accessibilityLabel="Passar perfil">
              <Ionicons name="close" size={32} color="#7B1FCF" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.super, styles.small, !profile && styles.glassDisabled]}>
            <TouchableOpacity testID="btn-superlike" style={styles.hit} onPress={() => next("superlike")} disabled={!profile} accessibilityRole="button" accessibilityLabel="Super like">
              <Ionicons name="star" size={20} color="#2D9CDB" />
            </TouchableOpacity>
          </BlurView>
          <BlurView intensity={40} tint="light" style={[styles.glass, styles.like, !profile && styles.glassDisabled]}>
            <TouchableOpacity testID="btn-like" style={styles.hit} onPress={() => next("like")} disabled={!profile} accessibilityRole="button" accessibilityLabel="Curtir perfil">
              <Ionicons name="heart" size={30} color="#12B76A" />
            </TouchableOpacity>
          </BlurView>
        </View>
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
  emptyLink: { fontSize: 14, fontWeight: "700", color: "#6D1BC7", textDecorationLine: "underline", paddingVertical: 6 },
  restart: { backgroundColor: "#6D1BC7", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  restartText: { color: "#fff", fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 8, paddingBottom: 136 },
  undoRow: { alignItems: "center", marginTop: 8 },
  undoGlass: { width: 52, height: 52, borderRadius: 26, borderColor: "#6D1BC7" },
  glass: { width: 72, height: 72, borderRadius: 36, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1.6, backgroundColor: "rgba(255,255,255,0.65)" },
  glassDisabled: { opacity: 0.4 },
  small: { width: 72, height: 72, borderRadius: 36 },
  pass: { borderColor: "#7B1FCF" },
  super: { borderColor: "#2D9CDB" },
  like: { borderColor: "#12B76A" },
  hit: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
});
