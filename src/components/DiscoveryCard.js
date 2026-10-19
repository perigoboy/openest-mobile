// src/components/DiscoveryCard.js
// T029 — cartão da tela de Descoberta: a foto do perfil (ImageBackground)
// ocupa ~80% da altura da tela com um gradiente escuro na base, exibindo
// nome, idade, localização e distância com excelência visual.
import React from "react";
import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// Fração da altura da tela ocupada pelo cartão (T029).
export const CARD_SCREEN_RATIO = 0.8;

export default function DiscoveryCard({ profile, style }) {
  const { height: windowHeight } = useWindowDimensions();
  if (!profile) return null;

  return (
    <ImageBackground
      testID="discovery-card"
      source={{ uri: profile.photo }}
      imageStyle={styles.image}
      resizeMode="cover"
      // 80% da tela, limitado ao espaço disponível (a Discovery tem topBar
      // e barra de ações; em telas pequenas o flex previne overflow).
      style={[styles.card, { height: Math.round(windowHeight * CARD_SCREEN_RATIO), maxHeight: "100%" }, style]}
    >
      {profile.kindLabel ? (
        <BlurView intensity={30} tint="light" style={styles.badge}>
          <Ionicons name="people" size={16} color="#6D1BC7" />
          <Text style={styles.badgeText}>{profile.kindLabel}</Text>
        </BlurView>
      ) : null}

      <LinearGradient testID="discovery-shade" colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.shade} />

      <View style={styles.footer}>
        <Text testID="discovery-name" style={styles.name}>
          {profile.name}, {profile.age}
        </Text>
        <Text style={styles.loc}>Mora em {profile.neighborhood}, {profile.city}</Text>
        <Text style={styles.dist}>{profile.distance}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  image: { borderRadius: 28 },
  badge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#6D1BC7" },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 220 },
  footer: { position: "absolute", left: 18, right: 18, bottom: 18 },
  name: { fontSize: 28, fontWeight: "800", color: "#fff" },
  loc: { marginTop: 4, fontSize: 15, color: "rgba(255,255,255,0.92)" },
  dist: { fontSize: 14, color: "rgba(255,255,255,0.82)" },
});
