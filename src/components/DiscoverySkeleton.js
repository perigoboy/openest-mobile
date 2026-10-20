// src/components/DiscoverySkeleton.js
// T031 — skeleton do card de Descoberta: replica o layout do DiscoveryCard
// (foto + linhas de nome/cidade/distância) com pulso de opacidade enquanto a
// API responde, garantindo que a Discovery nunca exiba tela em branco durante
// o carregamento (critério de aceite da T031).
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { CARD_SCREEN_RATIO } from "./DiscoveryCard";

export default function DiscoverySkeleton({ style }) {
  const { height: windowHeight } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      testID="discovery-skeleton"
      style={[
        styles.card,
        { flex: 1, maxHeight: Math.round(windowHeight * CARD_SCREEN_RATIO), opacity: pulse },
        style,
      ]}
    >
      <View style={styles.photo} />
      <View style={styles.footer}>
        <View style={[styles.line, styles.lineName]} />
        <View style={[styles.line, styles.lineCity]} />
        <View style={[styles.line, styles.lineDist]} />
      </View>
    </Animated.View>
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
  photo: { flex: 1, backgroundColor: "#EDE3F9" },
  footer: { position: "absolute", left: 18, right: 18, bottom: 18, gap: 8 },
  line: { borderRadius: 6, backgroundColor: "rgba(109,27,199,0.22)" },
  lineName: { height: 24, width: "62%" },
  lineCity: { height: 14, width: "78%" },
  lineDist: { height: 12, width: "34%" },
});