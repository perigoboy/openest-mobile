// T012 — Cadastro. Visual do tema (claro/escuro) sobre o AuthLayout.
// Os toques usam TouchableOpacity (o teste da tela simula esse componente).
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components';
import AuthLayout from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, useThemedStyles } from '../../contexts/ThemeContext';
import { radius, spacing, typography } from '../../styles/theme';

export default function Register({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();

  // LGPD: exibe o texto dos Termos de Uso e da Política de Privacidade.
  function handleOpenTerms() {
    Alert.alert(
      'Termos de Uso e Política de Privacidade',
      'Em conformidade com a LGPD, seus dados de perfil e relacionamento são tratados com segurança e criptografia para o funcionamento do Openest Mobile.'
    );
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // T012: mesma regra de senha mínima que o backend aplica (userController.js),
    // evita uma ida e volta de rede só para descobrir que a senha é curta demais.
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Consentimento Obrigatório', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.');
      return;
    }

    setSubmitting(true);
    try {
      // T012: signUp já dispara o POST correto (/api/users/register) e faz o
      // auto-login salvando o token — a troca para o AppRoutes acontece
      // sozinha (ver src/routes/index.js), sem precisar navegar manualmente.
      await signUp(name, email, password, 'solteiro');
    } catch (error) {
      // O backend do cadastro responde erros na chave `error` (diferente do
      // login, que usa `message`) — ver userController.js.
      const backendMessage = error?.response?.data?.error;
      Alert.alert('Erro no cadastro', backendMessage || 'Não foi possível realizar o cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Leva menos de um minuto."
      footer={
        <TouchableOpacity
          testID="link-login"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.footerText}>
            Já tem uma conta? <Text style={styles.footerLink}>Entrar</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <Input
        label="Nome"
        accessibilityLabel="Nome"
        testID="input-name"
        placeholder="Como você quer ser chamado"
        autoCapitalize="words"
        autoComplete="name"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="E-mail"
        accessibilityLabel="E-mail"
        testID="input-email"
        placeholder="voce@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <Input
        label="Senha"
        accessibilityLabel="Senha"
        testID="input-password"
        placeholder="Mínimo de 6 caracteres"
        secureTextEntry
        secureToggle
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />

      {/* Consentimento dos Termos de Uso (LGPD) */}
      <View style={styles.termsContainer}>
        <TouchableOpacity
          testID="checkbox-terms"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          accessibilityLabel="Aceito os Termos de Uso e a Política de Privacidade"
          style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
        >
          {acceptedTerms ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </TouchableOpacity>
        <View style={styles.termsTextContainer}>
          <Text style={styles.termsText}>Li e concordo com os </Text>
          <TouchableOpacity accessibilityRole="link" accessibilityLabel="Ler os Termos de Uso" testID="link-terms" onPress={handleOpenTerms}>
            <Text style={styles.termsLink}>Termos de Uso e LGPD</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        testID="btn-submit"
        accessibilityRole="button"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? <ActivityIndicator color={colors.onPrimary} style={styles.buttonSpinner} /> : null}
        <Text style={styles.buttonText}>
          {submitting ? 'Cadastrando...' : 'Cadastrar'}
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    termsTextContainer: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    termsText: {
      ...typography.body,
      fontSize: 14,
      color: colors.textSecondary,
    },
    termsLink: {
      ...typography.body,
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    button: {
      height: 50,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonSpinner: {
      marginRight: 8,
    },
    buttonText: {
      ...typography.bodyStrong,
      fontSize: 16,
      color: colors.onPrimary,
    },
    footerText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    footerLink: {
      color: colors.accent,
      fontWeight: '700',
    },
  });
