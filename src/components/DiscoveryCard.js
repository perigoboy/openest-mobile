// src/components/DiscoveryCard.js
// T029 — cartão da tela de Descoberta: a foto do perfil (ImageBackground)
// ocupa o espaço disponível da área do cartão, com teto de ~80% da altura da
// tela, com gradiente escuro na base, exibindo nome, idade, localização e
// distância com excelência visual — sem nunca cobrir topBar ou barra de ações.
// T032 — gesto de swipe com react-native-gesture-handler + Reanimated: o
// arraste move/rotaciona o cartão com animação fluida e, ao ultrapassar o
// threshold (ou com um flick rápido), aciona o MESMO callback de ação dos
// botões Like/Pass da Discovery via `onSwipe(direction)`.
import React, { useEffect } from "react";
import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// Fração da altura da tela ocupada pelo cartão (T029).
export const CARD_SCREEN_RATIO = 0.8;
// Fração da largura da tela que o arraste precisa atingir para completar o
// swipe (T032) — 30% é o padrão de apps de relacionamento.
export const SWIPE_SCREEN_RATIO = 0.3;
// Velocidade (px/s) mínima de um "flick" rápido que completa o swipe mesmo
// com deslocamento curto (T032).
export const SWIPE_VELOCITY_THRESHOLD = 700;

// T032 — decide se o arraste completa o swipe: "like" (para a direita),
// "pass" (para a esquerda) ou null (volta ao centro com spring). A velocidade
// só completa quando o arraste residual aponta para o mesmo lado, evitando
// gatilho invertido em gestos de ida e volta. A diretiva "worklet" é o que
// permite rodar dentro do onEnd na UI thread (e continua chamável do JS/Jest).
export function resolveSwipe(translationX, velocityX, threshold) {
  "worklet";
  const flickRight = velocityX >= SWIPE_VELOCITY_THRESHOLD && translationX >= 0;
  const flickLeft = velocityX <= -SWIPE_VELOCITY_THRESHOLD && translationX <= 0;
  if (translationX >= threshold || flickRight) return "like";
  if (-translationX >= threshold || flickLeft) return "pass";
  return null;
}

export default function DiscoveryCard({ profile, style, onSwipe }) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const swipeThreshold = Math.round(windowWidth * SWIPE_SCREEN_RATIO);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Volta ao centro quando o perfil muda (swipe concluído, baralho avançado
  // pelos botões ou reinício) — acontece depois que a saída já animou.
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [profile, translateX, translateY]);

  // T032 — gesto Pan: o arraste segue o dedo (com deslocamento vertical
  // suave); no fim, resolveSwipe decide entre completar (anima o cartão para
  // fora da tela e chama onSwipe na JS thread) ou voltar ao centro com spring.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      const direction = resolveSwipe(e.translationX, e.velocityX, swipeThreshold);
      if (!direction) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
        return;
      }
      const offScreen = direction === "like" ? windowWidth * 1.4 : -windowWidth * 1.4;
      translateX.value = withTiming(offScreen, { duration: 240 }, (finished) => {
        if (finished && onSwipe) runOnJS(onSwipe)(direction);
      });
      translateY.value = withTiming(translateY.value, { duration: 240 });
    });

  // Rotação proporcional ao arraste (até ±12°) dá o "peso" visual do gesto.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-windowWidth, 0, windowWidth], [-12, 0, 12])}deg` },
    ],
  }));

  // Selos CURTIR/PASSAR surgem conforme o arraste se aproxima do threshold.
  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(translateX.value / swipeThreshold, 0), 1),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-translateX.value / swipeThreshold, 0), 1),
  }));

  if (!profile) return null;

  return (
    // O Animated.View É o cartão (layout + testID + transformações do
    // gesto): o ImageBackground do RN repassa o testID somente para o Image
    // interno, então o container de layout precisa existir por conta própria.
    // O flex faz o cartão preencher exatamente o espaço livre da Discovery
    // (nunca cobre a topBar com avatar e filtros nem a barra de ações) e o
    // maxHeight numérico limita a 80% da tela (T029). O GestureDetector não
    // cria view — só attacha o gesto no filho único — então o layout
    // continua idêntico; e animar o próprio cartão (um wrapper interno
    // seria recortado pelo overflow: hidden) deixa a saída visível (T032).
    <GestureDetector gesture={pan}>
      <Animated.View
        testID="discovery-card"
        style={[styles.card, { flex: 1, maxHeight: Math.round(windowHeight * CARD_SCREEN_RATIO) }, style, animatedStyle]}
      >
        <ImageBackground
          testID="discovery-card-image"
          source={{ uri: profile.photo }}
          imageStyle={styles.image}
          resizeMode="cover"
          style={styles.fill}
        >
          {profile.kindLabel ? (
            <BlurView intensity={30} tint="light" style={styles.badge}>
              <Ionicons name="people" size={16} color="#6D1BC7" />
              <Text style={styles.badgeText}>{profile.kindLabel}</Text>
            </BlurView>
          ) : null}

          <LinearGradient testID="discovery-shade" colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.shade} />

          {/* Selos do gesto (T032) — pointerEvents="none" para não roubar o toque. */}
          <Animated.View style={[styles.stamp, styles.stampLike, likeStampStyle]} pointerEvents="none" testID="discovery-stamp-like">
            <Text style={[styles.stampText, styles.stampLikeText]}>CURTIR</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampPass, passStampStyle]} pointerEvents="none" testID="discovery-stamp-pass">
            <Text style={[styles.stampText, styles.stampPassText]}>PASSAR</Text>
          </Animated.View>

          <View style={styles.footer}>
            <Text testID="discovery-name" style={styles.name}>
              {profile.name}, {profile.age}
            </Text>
            <Text style={styles.loc}>Mora em {profile.neighborhood}, {profile.city}</Text>
            <Text style={styles.dist}>{profile.distance}</Text>
          </View>
        </ImageBackground>
      </Animated.View>
    </GestureDetector>
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
  fill: { flex: 1 },
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
  // Selos CURTIR/PASSAR do gesto de swipe (T032)
  stamp: {
    position: "absolute",
    top: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  stampLike: { left: 18, borderColor: "#12B76A", transform: [{ rotate: "-14deg" }] },
  stampLikeText: { color: "#12B76A" },
  stampPass: { right: 18, borderColor: "#7B1FCF", transform: [{ rotate: "14deg" }] },
  stampPassText: { color: "#7B1FCF" },
  stampText: { fontSize: 22, fontWeight: "900", letterSpacing: 1 },
});
