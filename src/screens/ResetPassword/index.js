// Redefinição de senha com o token recebido por e-mail.
// Usa a MESMA rota do web: POST /api/users/reset-password { token, newPassword }
// (antes chamava PATCH /auth/reset-password, que não existe na API → 404).
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Input } from '../../components';
import AuthLayout from '../../components/AuthLayout';
import api from '../../services/api';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword({ route, navigation }) {
  const tokenFromRoute = route?.params?.token || '';

  const [token, setToken] = useState(tokenFromRoute);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleResetPassword() {
    if (!token.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Atenção', `A nova senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/users/reset-password', { token: token.trim(), newPassword });

      Alert.alert(
        'Sucesso',
        'Senha redefinida com sucesso! Faça login com sua nova senha.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      Alert.alert(
        'Erro',
        error?.response?.data?.error || 'Não foi possível redefinir a senha. O token pode estar expirado ou inválido.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Crie uma senha nova para a sua conta.">
      {!tokenFromRoute ? (
        <Input
          label="Código de recuperação"
          accessibilityLabel="Código de recuperação"
          testID="input-token"
          placeholder="Cole o código do e-mail"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />
      ) : null}
      <Input
        label="Nova senha"
        accessibilityLabel="Nova senha"
        testID="input-new-password"
        placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
        secureTextEntry
        secureToggle
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <Input
        label="Confirmar nova senha"
        accessibilityLabel="Confirmar nova senha"
        testID="input-confirm-password"
        placeholder="Repita a nova senha"
        secureTextEntry
        secureToggle
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Button testID="btn-submit" title="Salvar nova senha" onPress={handleResetPassword} loading={submitting} />
    </AuthLayout>
  );
}
