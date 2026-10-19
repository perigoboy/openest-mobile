// Discovery — redesign liquid glass (FRONT-ONLY, baralho mockado).
import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_PROFILES } from "./mockProfiles";

export default function Discovery() {
  const [index, setIndex] = useState(0);
  const profile = MOCK_PROFILES[index] || null;
  function next() {
    setIndex((i) => i + 1);
  }

  return (
    <LinearGradient colors={["#3D0A7A", "#8B3BD6", "#E3BFFF", "#F9F1FF"]} locations={[0, 0.4, 0.75, 1]} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" }} style={styles.avatar} />
          </View>
          <View style={styles.brandCenter} pointerEvents="none">
            <Image testID="discovery-brand" source={require("../../../assets/logo-chama.png")} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <BlurView intensity={55} tint="dark" style={styles.pill}>
            <Ionicons name="options" size={16} color="#fff" />
            <Text style={styles.pillText} numberOfLines={1}>Perto de mim</Text>
          </BlurView>
        </View>

        <View style={styles.cardArea}>
          {profile ? (
            <View testID="discovery-card" style={styles.card}>
              <Image source={{ uri: profile.photo }} style={styles.photo} resizeMode="cover" />
              {profile.kindLabel ? (
                <BlurView intensity={30} tint="light" style={styles.badge}>
                  <Ionicons name="people" size={16} color="#6D1BC7" />
                  <Text style={styles.badgeText}>{profile.kindLabel}</Text>
                </BlurView>
              ) : null}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.shade} />
              <View style={styles.footer}>
                <Text testID="discovery-name" style={styles.name}>{profile.name}, {profile.age}</Text>
                <Text style={styles.loc}>Mora em {profile.neighborhood}, {profile.city}</Text>
                <Text style={styles.dist}>{profile.distance}</Text>
              </View>
            </View>
          ) : (
            <BlurView intensity={40} tint="light" style={styles.empty}>
              <Text style={styles.emptyTitle}>Você viu todo mundo</Text>
              <TouchableOpacity testID="btn-restart" style={styles.restart} onPress={() => setIndex(0)}>
                <Text style={styles.restartText}>Ver de novo</Text>
              </TouchableOpacity>
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
  cardArea: { flex: 1, justifyContent: "center", paddingVertical: 12 },
  card: { height: 480, borderRadius: 28, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
  photo: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" },
  badge: { position: "absolute", top: 16, left: 16, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#6D1BC7" },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 220 },
  footer: { position: "absolute", left: 18, right: 18, bottom: 18 },
  name: { fontSize: 28, fontWeight: "800", color: "#fff" },
  loc: { marginTop: 4, fontSize: 15, color: "rgba(255,255,255,0.92)" },
  dist: { fontSize: 14, color: "rgba(255,255,255,0.82)" },
  empty: { borderRadius: 28, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#2A0A55" },
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
