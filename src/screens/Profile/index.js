// src/screens/Profile/index.js
// PLACEHOLDER — a visualização real de Perfil é a T018 (Sprint 3).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "../../components";
import { colors, spacing, typography } from "../../styles/theme";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Avatar name="Openest User" size={72} />
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Tela real chega na T018 (Sprint 3)</Text>
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
  title: { ...typography.h1, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
});
