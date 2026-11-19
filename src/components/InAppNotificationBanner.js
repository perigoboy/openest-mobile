// src/components/InAppNotificationBanner.js
// Front-1 — Banner flutuante estilo Instagram: desliza do topo ao chegar uma
// mensagem/match, mostra foto (Cloudinary) + nome + prévia, fecha sozinho em
// 4s e, ao tocar, abre o chat daquela pessoa.
//
// Começa oculto e só aparece quando o RealtimeContext publica um evento real
// em inAppNotifications (nunca fica parado na tela sem motivo).
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "./Avatar";
import { subscribeInApp } from "../services/inAppNotifications";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { navigateToChat } from "../routes/navigationRef";
import { colors, radius, spacing, typography } from "../styles/theme";

export const AUTO_DISMISS_MS = 4000;
const EXIT_MS = 220;
const HIDDEN_Y = -240;

export default function InAppNotificationBanner() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(null);
  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;
  const dismissTimer = useRef(null);
  const exitTimer = useRef(null);

  useEffect(() => subscribeInApp((notification) => setCurrent(notification)), []);

  useEffect(() => {
    if (!current) return undefined;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
      speed: 14,
    }).start();
    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(dismissTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // A limpeza do estado é guiada por timer (não pelo callback da animação),
  // para o comportamento ser determinístico e testável.
  function hide() {
    clearTimeout(dismissTimer.current);
    Animated.timing(translateY, { toValue: HIDDEN_Y, duration: EXIT_MS, useNativeDriver: true }).start();
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setCurrent(null), EXIT_MS);
  }

  useEffect(() => () => {
    clearTimeout(dismissTimer.current);
    clearTimeout(exitTimer.current);
  }, []);

  function handlePress() {
    const notification = current;
    hide();
    if (notification?.conversationId != null) {
      navigateToChat(notification.conversationId, {
        id: notification.userId ?? null,
        name: notification.name,
        avatar: notification.avatar,
      });
    }
  }

  if (!current) return null;

  const isMatch = current.type === "match";
  const title = current.name || (isMatch ? "Novo match" : "Nova mensagem");

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + spacing.xs, transform: [{ translateY }] }]}
    >
      <TouchableOpacity
        testID="in-app-notification"
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${current.message}. Toque para abrir a conversa.`}
        style={styles.banner}
      >
        <View>
          <Avatar uri={resolveMediaUrl(current.avatar) || undefined} name={title} size={44} />
          {isMatch ? (
            <View style={styles.matchBadge}>
              <Ionicons name="heart" size={12} color={colors.white} />
            </View>
          ) : null}
        </View>
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>{title}</Text>
          <Text style={styles.message} numberOfLines={1}>{current.message}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 2000,
    elevation: 2000,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  matchBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
  },
  texts: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text,
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
