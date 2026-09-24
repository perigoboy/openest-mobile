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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('solteiro');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();

  // Função auxiliar para simular a abertura dos Termos de Uso
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
      await signUp(name, email, password, relationshipStatus);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Preencha os dados para começar</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nome Completo"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Status de Relacionamento</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={relationshipStatus}
                onValueChange={(itemValue) => setRelationshipStatus(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Solteiro(a)" value="solteiro" />
                <Picker.Item label="Casado(a) / Em um relacionamento" value="relacionamento" />
                <Picker.Item label="Outro" value="outro" />
              </Picker>
            </View>

            {/* Checkbox de Termos de Uso (LGPD) */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              />
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>Li e concordo com os </Text>
                <TouchableOpacity onPress={handleOpenTerms}>
                  <Text style={styles.termsLink}>Termos de Uso e LGPD</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Cadastrando...' : 'Cadastrar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>Já tem uma conta? Faça login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e272e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#576574',
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
  label: {
    fontSize: 14,
    color: '#576574',
    marginBottom: 6,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdde1',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0984e3',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0984e3',
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: '#576574',
  },
  termsLink: {
    fontSize: 14,
    color: '#0984e3',
    fontWeight: 'bold',
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
