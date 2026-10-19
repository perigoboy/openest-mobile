// Discovery â€” redesign liquid glass (FRONT-ONLY, baralho mockado).
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_PROFILES } from "./mockProfiles";
import { DiscoveryCard } from "../../components";
import { DEFAULT_PREFERENCES, loadPreferences } from "../../services/searchPreferences";
import { FALLBACK_LOCATION, distanceKm, loadLocation, requestLocation } from "../../services/userLocation";

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
  const [userLocation, setUserLocation] = useState(null);
  const deck = applyPreferences(MOCK_PROFILES, prefs, userLocation || FALLBACK_LOCATION);
  const profile = deck[index] || null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadPreferences();
      if (mounted) setPrefs(saved);
      const storedLoc = await loadLocation();
      if (mounted && storedLoc) setUserLocation(storedLoc);
      // Captura a posiÃ§Ã£o real (pede permissÃ£o no device; no front sem
      // permissÃ£o mantÃ©m o fallback sem quebrar).
      const result = await requestLocation();
      if (mounted && result?.location) setUserLocation(result.location);
    })();
    // Recarrega ao voltar dos Filtros (quando hÃ¡ listener de foco).
    const unsubscribe =
      navigation && typeof navigation.addListener === "function"
        ? navigation.addListener("focus", async () => {
            const saved = await loadPreferences();
            if (mounted) {
              setPrefs(saved);
              setIndex(0);
            }
          })
        : undefined;
    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  function openFilters() {
    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("SearchPreferences", {
        initial: prefs,
        onApply: (clean) => {
          setPrefs(clean);
          setIndex(0);
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
          {profile ? (
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
});
