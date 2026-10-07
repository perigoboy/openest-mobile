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
import api from '../../services/api';

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { signIn } = useAuth();

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/users/register', {
        name,
        email,
        password,
        status_relacionamento: 'solteiro',
      });
      setIsSuccess(true);
    } catch (error) {
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
                
                {isSuccess ? (
                  <View style={styles.successContainer}>
                    <Text style={styles.successText}>Cadastro realizado com sucesso.</Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={async () => {
                        try {
                          await signIn(email, password);
                        } catch (error) {
                          Alert.alert('Erro', 'Não foi possível fazer o login automático.');
                        }
                      }}
                    >
                      <Text style={styles.buttonText}>DESLIZAR</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.formContainer}>
                    <Text style={styles.label}>Nome</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={name}
                      onChangeText={setName}
                    />

                    <Text style={styles.label}>Email</Text>
                    <TextInput
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
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />

                    <TouchableOpacity
                      style={[styles.button, submitting && styles.buttonDisabled]}
                      onPress={handleRegister}
                      disabled={submitting}
                    >
                      <Text style={styles.buttonText}>
                        {submitting ? 'CADASTRANDO...' : 'CADASTRE-SE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  successContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
});