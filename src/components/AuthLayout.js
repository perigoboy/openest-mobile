// Moldura das telas de autenticação (entrar, cadastro, recuperar senha):
// marca no topo, título, subtítulo e o formulário — sobre o fundo do tema,
// sem degradê nem cartão de vidro. Rola com o teclado aberto.
import React from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../contexts/ThemeContext";
import { spacing, typography } from "../styles/theme";

export default function AuthLayout({ title, subtitle, children, footer, showLogo = true }) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showLogo ? (
            <Image
              source={require("../../assets/logo-completa.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Openest"
            />
          ) : null}
          {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.form}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    logo: {
      width: 120,
      height: 120,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
    },
    form: {
      marginTop: spacing.lg,
    },
    footer: {
      marginTop: spacing.lg,
      alignItems: "center",
      rowGap: spacing.sm,
    },
  });
