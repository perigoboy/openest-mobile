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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api from '../../services/api';

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
    <LinearGradient colors={['#3a0ca3', '#1e003b']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.innerContainer}
        >
          <View style={styles.cardContainer}>
            <BlurView intensity={50} tint="dark" style={styles.blurCard}>
              <View style={styles.headerContainer}>
                <Image 
                  source={require('../../../assets/logo-chama.png')} 
                  style={styles.logo} 
                  resizeMode="contain"
                />
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
                  placeholderTextColor="rgba(255,255,255,0.6)"
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
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  blurCard: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#7209b7',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
