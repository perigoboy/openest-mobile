// src/screens/Auth/Login/index.js
// PLACEHOLDER — a UI real de Login é a T010 (Sprint 2).
// Existe agora só para o roteamento (T005) ter uma tela de destino para testar.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../../../components";
import { colors, spacing, typography } from "../../../styles/theme";

export default function Login({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Tela real chega na T010 (Sprint 2)</Text>
      <Button
        title="Ir para Cadastro"
        variant="outline"
        onPress={() => navigation.navigate("Register")}
        style={{ marginTop: spacing.lg }}
      />
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
