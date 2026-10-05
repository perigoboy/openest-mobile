// src/screens/Profile/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Avatar } from "../../components";
import { colors, spacing, typography } from "../../styles/theme";
import api from "../../services/api";

export default function Profile({ navigation }) {
  const [userData, setUserData] = useState({
    name: "Carregando...",
    email: "carregando@email.com",
    firstName: "",
    lastName: "",
    gender: "",
    username: "",
    language: "",
    education: "",
    maritalStatus: "",
    cityNeighborhood: "",
    bio: "",
  });

  // Lista dinâmica de fotos do carrossel do usuário
  const [photos, setPhotos] = useState([
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'
  ]);

  // Buscar dados reais do usuário logado (T018)
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await api.get('/users/perfil');
        if (response.data) {
          setUserData({
            ...userData,
            name: response.data.name || response.data.username || "Usuário Openest",
            email: response.data.email || "",
            firstName: response.data.firstName || "",
            lastName: response.data.lastName || "",
            gender: response.data.gender || "",
            username: response.data.username || "",
            language: response.data.language || "",
            education: response.data.education || "",
            maritalStatus: response.data.maritalStatus || "",
            cityNeighborhood: response.data.cityNeighborhood || "",
            bio: response.data.bio || "",
          });
          if (response.data.photos && response.data.photos.length > 0) {
            setPhotos(response.data.photos);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar perfil do banco de dados:", error);
        // Mantém dados amigáveis se a API falhar temporariamente no mock
        setUserData(prev => ({
          ...prev,
          name: "Usuário Atual",
          email: "usuario@openest.com"
        }));
      }
    }
    fetchProfile();
  }, []);

  // Função para adicionar nova foto da galeria
  async function handleAddPhoto() {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permissão negada", "Precisamos de permissão para aceder à galeria.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        setPhotos([...photos, newUri]);
        Alert.alert("Sucesso", "Foto adicionada ao perfil!");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    }
  }

  // Função para remover foto do carrossel
  function handleRemovePhoto(indexToRemove) {
    if (photos.length <= 1) {
      Alert.alert("Atenção", "Você precisa manter pelo menos uma foto no perfil.");
      return;
    }

    Alert.alert(
      "Remover Foto",
      "Deseja remover esta foto do seu perfil?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            const updatedPhotos = photos.filter((_, index) => index !== indexToRemove);
            setPhotos(updatedPhotos);
          }
        }
      ]
    );
  }

  async function handleSave() {
    try {
      // Aqui você enviaria os dados atualizados + fotos para a API
      Alert.alert("Sucesso", "Dados de perfil actualizados com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível guardar as alterações.");
    }
  }

  return (
    <LinearGradient colors={['#2c003e', '#1a0026', '#0d0012']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Topo / Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>OPENEST</Text>
          </View>

          {/* Avatar e Informações Dinâmicas do Usuário */}
          <View style={styles.avatarContainer}>
            <Avatar name={userData.name} size={80} />
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>

          {/* Carrossel de Fotos com Opção de Adicionar e Remover */}
          <View style={styles.carouselContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
              {photos.map((photoUri, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.photoCard, index === 0 && styles.photoCardActive]}
                  onLongPress={() => handleRemovePhoto(index)}
                  onPress={() => Alert.alert("Opção", "Toque longo para remover a foto.")}
                >
                  <Image source={{ uri: photoUri }} style={styles.carouselImage} />
                  <TouchableOpacity 
                    style={styles.removeBadge}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.removeBadgeText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {/* Botão para Adicionar Nova Foto */}
              <TouchableOpacity style={styles.addPhotoCard} onPress={handleAddPhoto}>
                <Text style={styles.addPhotoIcon}>＋</Text>
                <Text style={styles.addPhotoText}>Adicionar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Formulário de Campos Detalhados */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu Nome"
              placeholderTextColor="#999"
              value={userData.firstName}
              onChangeText={(text) => setUserData({ ...userData, firstName: text })}
            />

            <Text style={styles.label}>Sobrenome</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu Sobrenome"
              placeholderTextColor="#999"
              value={userData.lastName}
              onChangeText={(text) => setUserData({ ...userData, lastName: text })}
            />

            <Text style={styles.label}>Gênero</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu Gênero"
              placeholderTextColor="#999"
              value={userData.gender}
              onChangeText={(text) => setUserData({ ...userData, gender: text })}
            />

            <Text style={styles.label}>Usuário</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu Usuário"
              placeholderTextColor="#999"
              value={userData.username}
              onChangeText={(text) => setUserData({ ...userData, username: text })}
            />

            <Text style={styles.label}>Língua</Text>
            <TextInput
              style={styles.input}
              placeholder="Idioma principal"
              placeholderTextColor="#999"
              value={userData.language}
              onChangeText={(text) => setUserData({ ...userData, language: text })}
            />

            <Text style={styles.label}>Escolaridade</Text>
            <TextInput
              style={styles.input}
              placeholder="Sua escolaridade"
              placeholderTextColor="#999"
              value={userData.education}
              onChangeText={(text) => setUserData({ ...userData, education: text })}
            />

            <Text style={styles.label}>Estado civil</Text>
            <TextInput
              style={styles.input}
              placeholder="Status de relacionamento"
              placeholderTextColor="#999"
              value={userData.maritalStatus}
              onChangeText={(text) => setUserData({ ...userData, maritalStatus: text })}
            />

            <Text style={styles.label}>Cidade / Bairro</Text>
            <TextInput
              style={styles.input}
              placeholder="Sua localidade"
              placeholderTextColor="#999"
              value={userData.cityNeighborhood}
              onChangeText={(text) => setUserData({ ...userData, cityNeighborhood: text })}
            />

            <Text style={styles.label}>Biografia</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escreva sobre você..."
              placeholderTextColor="#999"
              multiline
              value={userData.bio}
              onChangeText={(text) => setUserData({ ...userData, bio: text })}
            />

            <TouchableOpacity style={styles.buttonWrapper} onPress={handleSave}>
              <LinearGradient
                colors={['#7b2cbf', '#5a189a', '#3c096c']}
                style={styles.button}
              >
                <Text style={styles.buttonText}>SALVAR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  logoContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 2,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.h2,
    color: "#fff",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  userEmail: {
    ...typography.body,
    color: colors.textMuted || "#dcdde1",
  },
  carouselContainer: {
    width: "100%",
    marginBottom: spacing.xl,
  },
  carouselScroll: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  photoCard: {
    width: 85,
    height: 115,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: spacing.xs,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  photoCardActive: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  removeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  addPhotoCard: {
    width: 85,
    height: 115,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  addPhotoIcon: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  formContainer: {
    width: "100%",
  },
  label: {
    ...typography.caption,
    color: "#fff",
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    marginBottom: spacing.md,
    color: "#2d3436",
  },
  textArea: {
    height: 100,
    paddingTop: spacing.sm,
    textAlignVertical: "top",
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  button: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});