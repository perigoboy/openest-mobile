// T013 — Recuperação de senha: pede o e-mail e a API envia o link.
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Button, Input } from '../../components';
import AuthLayout from '../../components/AuthLayout';
import { useThemedStyles } from '../../contexts/ThemeContext';
import { typography } from '../../styles/theme';
import api from '../../services/api';

export default function ForgotPassword({ navigation }) {
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Digite um e-mail válido.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/users/forgot-password', { email });

      Alert.alert(
        'Verifique seu e-mail',
        response.data?.message || 'Se este e-mail estiver cadastrado, um link de recuperação foi enviado.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      Alert.alert('Erro', 'Não foi possível processar sua solicitação agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <Pressable
          testID="link-back-login"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Text style={styles.footerLink}>Voltar para o login</Text>
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
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
      />
      <Button testID="btn-submit" title="Enviar link" onPress={handleSubmit} loading={submitting} />
    </AuthLayout>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    footerLink: {
      ...typography.bodyStrong,
      color: colors.accent,
    },
  });
