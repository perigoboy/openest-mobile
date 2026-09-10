// src/screens/Discovery/index.js
// PLACEHOLDER — o Discovery Engine real é a Sprint 4 (T026-T035).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../styles/theme";

export default function Discovery() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discovery</Text>
      <Text style={styles.subtitle}>Card de descoberta chega na Sprint 4</Text>
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
