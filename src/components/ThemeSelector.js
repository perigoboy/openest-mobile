// Seletor de tema: Claro / Escuro / Automático (segue o celular).
// A escolha é salva no aparelho e aplicada no app inteiro na hora.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../styles/theme";
import { selectionTick } from "../utils/haptics";

const OPTIONS = [
  { mode: "light", label: "Claro", icon: "sunny-outline" },
  { mode: "dark", label: "Escuro", icon: "moon-outline" },
  { mode: "system", label: "Automático", icon: "phone-portrait-outline" },
];

export default function ThemeSelector({ testID = "theme-selector" }) {
  const { mode, setMode, colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.track} testID={testID} accessibilityRole="radiogroup" accessibilityLabel="Tema do aplicativo">
      {OPTIONS.map((opt) => {
        const selected = mode === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            testID={`theme-option-${opt.mode}`}
            onPress={() => {
              if (selected) return;
              selectionTick();
              setMode(opt.mode);
            }}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Tema ${opt.label}`}
          >
            <Ionicons name={opt.icon} size={16} color={selected ? colors.accent : colors.textSecondary} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    track: {
      flexDirection: "row",
      padding: 4,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      columnGap: 6,
      minHeight: 40,
      borderRadius: radius.sm,
    },
    segmentSelected: {
      backgroundColor: colors.surfaceElevated,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colors.scheme === "dark" ? 0.35 : 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
    },
    labelSelected: {
      color: colors.textPrimary,
    },
  });
