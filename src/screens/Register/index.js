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
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            {/* Logo placeholder - replace with actual asset if available */}
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
                  testID="input-name"
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#A0A0A0"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  testID="input-email"
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A0A0A0"
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
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  testID="btn-submit"
                  accessibilityRole="button"
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E0A52', // Dark purple background matching prototype
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFF0F5', // Light pinkish-white card background
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#660066', // Purple button color
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
    textAlign: 'center',
  },
});