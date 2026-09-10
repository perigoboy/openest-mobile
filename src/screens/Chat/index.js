// src/screens/Chat/index.js
// PLACEHOLDER — a sala de chat real é a T043 (Sprint 5) + Socket.io na T045 (Sprint 6).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../styles/theme";

export default function Chat() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.subtitle}>UI real chega na T043 (Sprint 5)</Text>
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
