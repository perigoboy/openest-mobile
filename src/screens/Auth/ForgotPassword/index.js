// src/screens/Auth/ForgotPassword/index.js
// PLACEHOLDER — a UI real é a T013 (Sprint 2).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../../styles/theme";

export default function ForgotPassword() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Senha</Text>
      <Text style={styles.subtitle}>Tela real chega na T013 (Sprint 2)</Text>
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
