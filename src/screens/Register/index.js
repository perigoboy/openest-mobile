import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';

export default function Register({ navigation }) {
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
    <LinearGradient colors={['#3a0ca3', '#1e003b']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.cardContainer}>
              <BlurView intensity={50} tint="dark" style={styles.blurCard}>
                <Image 
                  source={require('../../../assets/logo-completa.png')} 
                  style={styles.logo} 
                  resizeMode="contain"
                />
                
                <View style={styles.formContainer}>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput
                    testID="input-name"
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    testID="input-email"
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />

                  <Text style={styles.label}>Senha</Text>
                  <TextInput
                    testID="input-password"
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />

                  {/* Checkbox de Termos de Uso (LGPD) */}
                  <View style={styles.termsContainer}>
                    <TouchableOpacity
                      testID="checkbox-terms"
                      accessibilityRole="button"
                      style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
                      onPress={() => setAcceptedTerms(!acceptedTerms)}
                    />
                    <View style={styles.termsTextContainer}>
                      <Text style={styles.termsText}>Li e concordo com os </Text>
                      <TouchableOpacity testID="link-terms" onPress={handleOpenTerms}>
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
                  >
                    <Text style={styles.buttonText}>
                      {submitting ? 'Cadastrando...' : 'Cadastrar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="link-login"
                    accessibilityRole="button"
                    style={styles.backLink}
                    onPress={() => navigation.goBack()}
                  >
                    <Text style={styles.backText}>Já tem uma conta? Faça login</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
    color: '#fff',
  },
  button: {
    backgroundColor: '#7209b7',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  checkboxChecked: {
    backgroundColor: '#7209b7',
    borderColor: '#fff',
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  termsLink: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
});