import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Onboarding({ navigation }) {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  function handleNextStep() {
    if (step === 1) {
      if (!photoUrl.trim() || !bio.trim()) {
        Alert.alert('Perfil incompleto', 'Por favor, adicione uma foto e uma bio mínima para continuar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setLocationGranted(true);
      setNotificationsGranted(true);
      setStep(3);
    } else {
      Alert.alert('Tudo pronto!', 'Perfil completo com sucesso.');
      navigation.replace('Home');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Passo {step} de 3</Text>
        <Text style={styles.title}>
          {step === 1 && 'Complete seu Perfil'}
          {step === 2 && 'Permissões Essenciais'}
          {step === 3 && 'Tudo Pronto!'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1 && 'Adicione uma foto principal e uma bio para aumentar seus matches.'}
          {step === 2 && 'Precisamos da sua localização e notificações para encontrar pessoas perto de você.'}
          {step === 3 && 'Seu perfil está minimamente completo e pronto para o Discovery.'}
        </Text>
      </View>

      <View style={styles.content}>
        {step === 1 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Link da sua foto principal (URL)"
              placeholderTextColor="#888"
              value={photoUrl}
              onChangeText={setPhotoUrl}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escreva uma bio mínima sobre você..."
              placeholderTextColor="#888"
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </>
        )}

        {step === 2 && (
          <View style={styles.permissionsContainer}>
            <Text style={styles.permissionText}>
              📍 Localização: {locationGranted ? '✅ Permitida' : 'Pendente'}
            </Text>
            <Text style={styles.permissionText}>
              🔔 Notificações: {notificationsGranted ? '✅ Permitidas' : 'Pendente'}
            </Text>
            <Text style={styles.permissionSubtext}>
              Toque em avançar para conceder as permissões necessárias do sistema.
            </Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>🎉 Parabéns!</Text>
            <Text style={styles.successSubtext}>
              Seu perfil atende a todos os critérios de qualidade para começar a explorar.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNextStep}>
          <Text style={styles.buttonText}>
            {step === 3 ? 'Acessar o Discovery' : 'Avançar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    marginTop: 20,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#0984e3',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e272e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#576574',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  permissionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdde1',
  },
  permissionText: {
    fontSize: 16,
    color: '#2f3640',
    marginBottom: 12,
    fontWeight: '600',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#576574',
    marginTop: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0984e3',
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 16,
    color: '#576574',
    textAlign: 'center',
  },
  footer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0984e3',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});