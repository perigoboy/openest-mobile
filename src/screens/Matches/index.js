// src/screens/Matches/index.js
// PLACEHOLDER — a lista de conversas real é a T040 (Sprint 5).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../styles/theme";

export default function Matches() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversas</Text>
      <Text style={styles.subtitle}>Lista real chega na T040 (Sprint 5)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
});
