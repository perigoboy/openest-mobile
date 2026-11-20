// T011 — Tela de login (entrada principal do app).
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Input } from "../../components";
import AuthLayout from "../../components/AuthLayout";
import { useAuth } from "../../contexts/AuthContext";
import { useThemedStyles } from "../../contexts/ThemeContext";
import { radius, spacing, typography } from "../../styles/theme";

export default function Login({ navigation }) {
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert("Erro no login", "Verifique suas credenciais e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Faça login para continuar"
      footer={
        <Pressable
          accessibilityRole="button"
          testID="link-register"
          onPress={() => navigation.navigate("Register")}
          hitSlop={8}
        >
          <Text style={styles.footerText}>
            Não tem uma conta? <Text style={styles.footerLink}>Cadastre-se</Text>
          </Text>
        </Pressable>
      }
    >
      <Input
        label="E-mail"
        accessibilityLabel="E-mail"
        testID="input-email"
        placeholder="voce@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      <Input
        label="Senha"
        accessibilityLabel="Senha"
        testID="input-password"
        placeholder="Sua senha"
        secureTextEntry
        secureToggle
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
        returnKeyType="go"
      />

      <Pressable
        accessibilityRole="button"
        testID="link-forgot"
        style={styles.forgot}
        onPress={() => navigation.navigate("ForgotPassword")}
        hitSlop={6}
      >
        <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
      </Pressable>

      <Button testID="btn-submit" title="Entrar" onPress={handleLogin} loading={submitting} />

      {/* Login de desenvolvimento (sem backend): só aparece em builds de dev,
          nunca no APK de apresentação. */}
      {__DEV__ ? (
        <View style={styles.devHint}>
          <Text style={styles.devHintText}>Modo dev · acesso sem backend: admin / 123</Text>
        </View>
      ) : null}
    </AuthLayout>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    forgot: {
      alignSelf: "flex-end",
      marginTop: -4,
      marginBottom: spacing.md,
    },
    forgotText: {
      ...typography.label,
      color: colors.accent,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    footerLink: {
      color: colors.accent,
      fontWeight: "700",
    },
    devHint: {
      marginTop: spacing.md,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
    },
    devHintText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
