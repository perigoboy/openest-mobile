// src/screens/Auth/Register/index.js
// PLACEHOLDER — a UI real de Cadastro é a T010/T011 (Sprint 2).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../../styles/theme";

export default function Register() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      <Text style={styles.subtitle}>Tela real chega na T010/T011 (Sprint 2)</Text>
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
