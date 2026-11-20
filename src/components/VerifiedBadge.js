import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "../styles/theme";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

/**
 * T023 — Selo "Verificado" (confiança da plataforma).
 *
 * Componente reutilizável: aparece no Perfil (T018) e entra no Card do
 * Discovery (Sprint 4) assim que o card existir — é só renderizar
 * <VerifiedBadge /> ao lado do nome quando `verified` for verdadeiro.
 */
export default function VerifiedBadge({
  testID = "badge-verificado",
  label = "Verificado",
  size = "md",
  style,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isSmall = size === "sm";
  const iconSize = isSmall ? 14 : 16;

  return (
    <View
      testID={testID}
      style={[styles.badge, isSmall && styles.badgeSmall, style]}
      accessibilityRole="text"
      accessibilityLabel="Perfil verificado"
    >
      <Ionicons name="checkmark-circle" size={iconSize} color={colors.successText} />
      {!!label && <Text style={[styles.label, isSmall && styles.labelSmall]}>{label}</Text>}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    color: colors.successText,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  labelSmall: {
    fontSize: 10,
  },
});
