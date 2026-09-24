import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

// T013 — Fluxo de "esqueci minha senha" (só a solicitação por e-mail).
// A tela de digitar o token + nova senha já existe em src/screens/ResetPassword
// mas é uma task separada (o endpoint dela ainda está incorreto, ver PR da T011).
export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Atenção', 'Digite um e-mail válido.');
      return;
    }

    setSubmitting(true);
    try {
      // Rota real: POST /api/users/forgot-password (server.js: app.use("/api/users", userRoutes)).
      // O backend SEMPRE responde 200 com a mesma mensagem genérica, exista o
      // e-mail ou não — é proposital (evita revelar quais e-mails estão
      // cadastrados), então não há um "caminho de sucesso" diferente de erro
      // aqui além de falha de rede/servidor.
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            Digite o e-mail da sua conta. Se ele estiver cadastrado, enviaremos
            um link para você redefinir a senha.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>{submitting ? 'Enviando...' : 'Enviar link de recuperação'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e272e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#576574',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dcdde1',
    marginBottom: 16,
    color: '#2f3640',
  },
  button: {
    backgroundColor: '#0984e3',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#0984e3',
    fontSize: 14,
  },
});
