// src/screens/Profile/index.js
// Visual: cards limpos sobre o fundo do tema (claro/escuro). A foto de
// perfil e as fotos da galeria vêm da CÂMERA ou da GALERIA, escolhidas numa
// gaveta (bottom sheet) estilo WhatsApp.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Button, PhotoGallery, VerifiedBadge } from "../../components";
import { ActionSheet } from "../../components/BottomSheet";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { pickImage } from "../../services/imageSource";
import { radius, spacing, typography } from "../../styles/theme";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { updateMyProfile } from "../../services/profile";
import { uploadProfilePhoto } from "../../services/uploadPhoto";
import {
  MAX_PROFILE_PHOTOS,
  addPhoto,
  movePhoto,
  photosFromProfile,
  persistProfilePhotos,
  removePhoto,
  sanitizePhotos,
  setMainPhoto,
} from "../../services/profilePhotos";

// Fechar a gaveta e abrir câmera/galeria no mesmo instante falha no iOS.
const SHEET_CLOSE_DELAY_MS = Platform.OS === "ios" ? 350 : 0;

export default function Profile({ navigation }) {
  const { updateUser } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // 'avatar' (trocar a foto principal) | 'gallery' (adicionar à galeria) | null
  const [photoSheet, setPhotoSheet] = useState(null);
  const [saving, setSaving] = useState(false);
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
    foto_url: "",
  });

  // Estado de envio da foto de perfil (T020) — evita envios duplicados
  // e dá feedback visual enquanto a imagem sobe para o Cloudinary.
  const [uploading, setUploading] = useState(false);

  // T022 — Modo Discreto (privacidade): flag vinda do banco + trava enquanto
  // o PATCH está em andamento (evita toques duplicados).
  const [modoDiscreto, setModoDiscreto] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // T023 — selo "Verificado": flag vinda do banco após aprovação da selfie.
  const [verificado, setVerificado] = useState(false);

  // Lista ordenada de fotos do perfil (T021): a posição 0 é a foto principal,
  // a mesma exibida no Avatar e no Card de Descoberta.
  const [photos, setPhotos] = useState([]);

  // Buscar dados reais do usuário logado (T018)
  async function fetchProfile() {
    try {
      // T020: prefixo /api (mesmo padrão do AuthContext) e guarda a foto
      // já salva no Cloudinary para exibir no Avatar.
      const response = await api.get('/api/users/perfil');
      if (response.data) {
        // T021: galeria ordenada vinda da API (`photos`), com fallback para
        // `foto_url` nos perfis antigos (mantém o Avatar funcionando).
        const profilePhotos = photosFromProfile(response.data);
        // O backend guarda só `name` (nome completo). Dividimos em Nome +
        // Sobrenome para a UI; no salvar juntamos de volta.
        const fullName = response.data.name || response.data.username || "Usuário Openest";
        const [firstName, ...rest] = String(fullName).trim().split(/\s+/);
        const mainFoto = response.data.foto_url || profilePhotos[0] || "";
        setUserData({
          ...userData,
          name: fullName,
          email: response.data.email || "",
          foto_url: mainFoto,
          firstName: firstName || "",
          lastName: rest.join(" "),
          gender: response.data.gender || "",
          username: response.data.username || "",
          language: response.data.language || "",
          education: response.data.education || "",
          // Estado civil ↔ status_relacionamento (o único campo persistido).
          maritalStatus: response.data.status_relacionamento || "",
          cityNeighborhood: response.data.cityNeighborhood || "",
          bio: response.data.bio || "",
        });
        if (profilePhotos.length > 0) {
          setPhotos(profilePhotos);
        }
        // Hidrata o contexto global (avatar do topo da Descoberta usa isto).
        updateUser?.({ name: fullName, foto_url: mainFoto, photos: profilePhotos });
        // T022: o Switch reflete a flag salva no banco (modo_discreto).
        setModoDiscreto(response.data.modo_discreto === true);
        // T023: o selo "Verificado" reflete a aprovação da selfie no banco.
        setVerificado(response.data.verificado === true);
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

  useEffect(() => {
    fetchProfile();
    // T023: refaz a busca quando a aba Perfil ganha foco, para o selo
    // "Verificado" aparecer logo após o usuário enviar a selfie na
    // tela de verificação (a aba fica montada durante todo o app).
    const unsubscribe =
      navigation && typeof navigation.addListener === "function"
        ? navigation.addListener("focus", fetchProfile)
        : undefined;
    return unsubscribe;
  }, []);

  // ---------------------------------------------------------------
  // T021 — galeria de múltiplas fotos: adicionar (upload no Cloudinary),
  // remover, reordenar e definir a foto principal, sempre persistindo a
  // ordem no backend (PUT /api/users/perfil).
  // ---------------------------------------------------------------

  // Envia a nova foto para a nuvem e acrescenta no fim da lista — ela não
  // substitui a principal — respeitando o limite N de fotos do perfil.
  function handleAddPhoto() {
    if (uploading) return;

    if (photos.length >= MAX_PROFILE_PHOTOS) {
      Alert.alert(
        "Limite atingido",
        `Você pode ter até ${MAX_PROFILE_PHOTOS} fotos no perfil.`
      );
      return;
    }
    setPhotoSheet("gallery");
  }

  // Câmera ou galeria → recorte → upload. `target` decide se a foto vira a
  // principal (avatar) ou entra no fim da galeria.
  function choosePhoto(source, target) {
    setTimeout(async () => {
      try {
        const asset = await pickImage(source, {
          allowsEditing: true,
          aspect: target === "avatar" ? [1, 1] : [4, 5],
          quality: 0.8,
        });
        if (!asset) return;
        if (target === "avatar") await uploadPhoto(asset);
        else await uploadGalleryPhoto(asset);
      } catch (error) {
        if (error?.code === "permission_denied") {
          Alert.alert("Permissão negada", error.message);
          return;
        }
        console.error("Erro ao escolher imagem:", error);
        Alert.alert("Erro", "Não foi possível carregar a imagem.");
      }
    }, SHEET_CLOSE_DELAY_MS);
  }

  // Upload da foto de galeria + gravação da lista ordenada no backend.
  async function uploadGalleryPhoto(asset) {
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(asset.uri, {
        fileName: asset.fileName || `profile-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      });

      const nextPhotos = addPhoto(photos, url);
      setPhotos(nextPhotos);
      await persistProfilePhotos(nextPhotos);
      updateUser?.({ photos: nextPhotos, foto_url: nextPhotos[0] || "" });

      Alert.alert("Sucesso", "Foto adicionada à galeria!");
    } catch (error) {
      console.error("Erro ao adicionar foto da galeria:", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível adicionar a foto.";
      Alert.alert("Erro", message);
    } finally {
      setUploading(false);
    }
  }

  // ---------------------------------------------------------------
  // T020 — troca da foto de perfil pela galeria/câmera com upload
  // na nuvem (Cloudinary) via FormData.
  // ---------------------------------------------------------------

  // Mostra as opções de origem da nova foto de perfil (gaveta).
  function handleChangePhoto() {
    if (uploading) return;
    setPhotoSheet("avatar");
  }

  // Monta o FormData e envia para POST /api/users/upload-photo; a API salva
  // no Cloudinary, devolve a URL e (T021) já grava a foto como principal
  // (posição 0 da galeria) — a UI local acompanha a mesma regra.
  async function uploadPhoto(asset) {
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(asset.uri, {
        fileName: asset.fileName || `profile-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      });

      setUserData((prev) => ({ ...prev, foto_url: url }));
      // A primeira posição da galeria é a foto principal do perfil.
      const nextPhotos = sanitizePhotos([url, ...photos.filter((uri) => uri !== url)]);
      setPhotos(nextPhotos);
      updateUser?.({ foto_url: url, photos: nextPhotos });

      Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso!");
    } catch (error) {
      console.error("Erro no upload da foto:", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível enviar a foto para a nuvem.";
      Alert.alert("Erro", message);
    } finally {
      setUploading(false);
    }
  }

  // Remove a foto da galeria (mantém ao menos uma) e salva a nova ordem.
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
          onPress: async () => {
            await applyPhotosChange(removePhoto(photos, indexToRemove));
          },
        }
      ]
    );
  }

  // Reordena a galeria pelas setas ←/→ do grid (T021).
  async function handleMovePhoto(from, to) {
    const updatedPhotos = movePhoto(photos, from, to);
    if (updatedPhotos.join("||") === photos.join("||")) return;
    await applyPhotosChange(updatedPhotos);
  }

  // Define outra foto como principal: move para a posição 0, que é o que o
  // Card de Descoberta exibe (foto_url acompanha photos[0]).
  async function handleSetMainPhoto(index) {
    if (index === 0) return;
    await applyPhotosChange(setMainPhoto(photos, index));
  }

  // Aplica a nova lista na UI (foto principal acompanha) e persiste a ordem.
  async function applyPhotosChange(updatedPhotos) {
    setPhotos(updatedPhotos);
    setUserData((prev) => ({ ...prev, foto_url: updatedPhotos[0] || "" }));
    updateUser?.({ photos: updatedPhotos, foto_url: updatedPhotos[0] || "" });

    try {
      await persistProfilePhotos(updatedPhotos);
    } catch (error) {
      console.error("Erro ao salvar a ordem das fotos:", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível salvar a ordem das fotos.";
      Alert.alert("Erro", message);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      // Mesmo contrato do web (PUT /api/users/perfil): junta Nome + Sobrenome
      // em `name` e mapeia Estado civil → status_relacionamento. Campos sem
      // coluna no backend (gênero, usuário, idioma...) são ignorados pela API.
      const name = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.name;
      const payload = {
        name,
        bio: userData.bio || "",
        status_relacionamento: userData.maritalStatus || undefined,
        // Campos adicionais agora persistidos pela API (migração add-profile-fields).
        gender: userData.gender || "",
        username: userData.username || "",
        language: userData.language || "",
        education: userData.education || "",
        cityNeighborhood: userData.cityNeighborhood || "",
        photos,
        foto_url: photos[0] || userData.foto_url || null,
      };
      const response = await updateMyProfile(payload);
      const saved = (response && response.user) || {};
      setUserData((prev) => ({ ...prev, name: saved.name || name }));
      updateUser?.({ name: saved.name || name, foto_url: payload.foto_url, photos });
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error?.response?.data || error?.message);
      Alert.alert("Erro", error?.response?.data?.error || "Não foi possível guardar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------
  // T022 — Modo Discreto: PATCH /api/users/perfil atualiza apenas a
  // flag modo_discreto no banco. A UI muda de forma otimista e volta
  // ao estado anterior se a API recusar; o alerta explica o impacto
  // com o texto devolvido pelo backend (critério de aceite).
  // ---------------------------------------------------------------
  async function handleToggleModoDiscreto(value) {
    if (savingPrivacy) return;

    const previous = modoDiscreto;
    setModoDiscreto(value); // otimista — rollback no catch
    setSavingPrivacy(true);
    try {
      const response = await api.patch("/api/users/perfil", {
        modo_discreto: value,
      });

      Alert.alert(
        value ? "Modo Discreto ativado" : "Modo Discreto desativado",
        (response.data && response.data.impacto) ||
          (value
            ? "Seu perfil deixa de aparecer no Discovery; matches e conversas continuam ativos."
            : "Seu perfil volta a aparecer no Discovery.")
      );
    } catch (error) {
      console.error("Erro ao atualizar o Modo Discreto:", error);
      setModoDiscreto(previous); // o banco não mudou — UI volta ao estado real
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível alterar o Modo Discreto.";
      Alert.alert("Erro", message);
    } finally {
      setSavingPrivacy(false);
    }
  }

  const photoOptions = [
    {
      key: "camera",
      testID: "photo-source-camera",
      label: "Tirar foto",
      description: "Usar a câmera agora",
      icon: "camera-outline",
      onPress: () => choosePhoto("camera", photoSheet),
    },
    {
      key: "gallery",
      testID: "photo-source-gallery",
      label: "Escolher da galeria",
      icon: "images-outline",
      onPress: () => choosePhoto("gallery", photoSheet),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle} accessibilityRole="header">Perfil</Text>

        {/* Avatar e informações do usuário (T020: foto na nuvem) */}
        <View style={[styles.card, styles.heroCard]}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={userData.foto_url} name={userData.name} size={88} />
            <Pressable
              accessibilityRole="button"
              testID="btn-change-photo"
              style={[styles.changePhotoButton, uploading && styles.changePhotoButtonDisabled]}
              onPress={handleChangePhoto}
              disabled={uploading}
              accessibilityLabel="Trocar foto de perfil"
              hitSlop={6}
            >
              <Ionicons name="camera" size={15} color={colors.onPrimary} />
            </Pressable>
          </View>
          <View style={styles.heroTexts}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {uploading ? "Enviando foto..." : userData.name}
              </Text>
              {/* T023 — selo "Verificado" após aprovação da selfie */}
              {verificado && <VerifiedBadge style={styles.verifiedBadge} />}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{userData.email}</Text>
          </View>
        </View>

        {/* Grade de fotos (T021): adicionar/remover/reordenar até N fotos */}
        <Text style={styles.sectionTitle}>FOTOS</Text>
        <View style={[styles.card, styles.cardPadded]}>
          <PhotoGallery
            photos={photos}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            onMove={handleMovePhoto}
            onSetMain={handleSetMainPhoto}
            disabled={uploading}
          />
        </View>

        {/* Formulário */}
        <Text style={styles.sectionTitle}>SOBRE VOCÊ</Text>
        <View style={[styles.card, styles.cardPadded]}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              accessibilityLabel="Nome"
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.firstName}
              onChangeText={(text) => setUserData({ ...userData, firstName: text })}
            />

            <Text style={styles.label}>Sobrenome</Text>
            <TextInput
              accessibilityLabel="Sobrenome"
              style={styles.input}
              placeholder="Seu sobrenome"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.lastName}
              onChangeText={(text) => setUserData({ ...userData, lastName: text })}
            />

            <Text style={styles.label}>Gênero</Text>
            <TextInput
              accessibilityLabel="Gênero"
              style={styles.input}
              placeholder="Seu gênero"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.gender}
              onChangeText={(text) => setUserData({ ...userData, gender: text })}
            />

            <Text style={styles.label}>Usuário</Text>
            <TextInput
              accessibilityLabel="Nome de usuário"
              style={styles.input}
              placeholder="Seu usuário"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.username}
              onChangeText={(text) => setUserData({ ...userData, username: text })}
            />

            <Text style={styles.label}>Língua</Text>
            <TextInput
              accessibilityLabel="Idioma principal"
              style={styles.input}
              placeholder="Idioma principal"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.language}
              onChangeText={(text) => setUserData({ ...userData, language: text })}
            />

            <Text style={styles.label}>Escolaridade</Text>
            <TextInput
              accessibilityLabel="Escolaridade"
              style={styles.input}
              placeholder="Sua escolaridade"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.education}
              onChangeText={(text) => setUserData({ ...userData, education: text })}
            />

            <Text style={styles.label}>Estado civil</Text>
            <TextInput
              accessibilityLabel="Status de relacionamento"
              style={styles.input}
              placeholder="Status de relacionamento"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.maritalStatus}
              onChangeText={(text) => setUserData({ ...userData, maritalStatus: text })}
            />

            <Text style={styles.label}>Cidade / Bairro</Text>
            <TextInput
              accessibilityLabel="Localidade"
              style={styles.input}
              placeholder="Sua localidade"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              value={userData.cityNeighborhood}
              onChangeText={(text) => setUserData({ ...userData, cityNeighborhood: text })}
            />

            <Text style={styles.label}>Biografia</Text>
            <TextInput
              accessibilityLabel="Sobre você"
              style={[styles.input, styles.textArea]}
              placeholder="Escreva sobre você..."
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              multiline
              value={userData.bio}
              onChangeText={(text) => setUserData({ ...userData, bio: text })}
            />
        </View>

        {/* Modo Discreto — privacidade principal (T022) */}
        <Text style={styles.sectionTitle}>PRIVACIDADE</Text>
        <View style={[styles.card, styles.cardPadded]} testID="card-modo-discreto">
          <View style={styles.privacyRow}>
            <View style={styles.privacyIcon}>
              <Ionicons name="eye-off-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.privacyTitle}>Modo Discreto</Text>
            <Switch
              testID="switch-modo-discreto"
              value={modoDiscreto}
              onValueChange={handleToggleModoDiscreto}
              disabled={savingPrivacy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
              accessibilityLabel="Ativar ou desativar Modo Discreto"
            />
          </View>
          <Text style={styles.privacyHint}>
            Oculta seu perfil do Discovery e desliga a confirmação de
            leitura: enquanto estiver ativo, nem você nem a outra pessoa
            veem os checks azuis de "visualizada" — as mensagens param em
            entregue (2 checks cinzas) para os dois lados. Seus matches e
            conversas continuam ativos. Salvo automaticamente.
          </Text>
          <Text style={[styles.privacyStatus, modoDiscreto && styles.privacyStatusOn]}>
            {savingPrivacy
              ? "Salvando..."
              : modoDiscreto
                ? "Ativado — perfil oculto e sem confirmação de leitura"
                : "Desativado — perfil visível e checks azuis ativos"}
          </Text>
        </View>

        <Button
          testID="btn-save-profile"
          title={saving ? "Salvando..." : "Salvar alterações"}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Salvar alterações do perfil"
          style={styles.saveButton}
        />
      </ScrollView>

      <ActionSheet
        testID="photo-source-sheet"
        visible={!!photoSheet}
        onClose={() => setPhotoSheet(null)}
        title={photoSheet === "avatar" ? "Foto de perfil" : "Adicionar foto"}
        options={photoOptions}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    screenTitle: {
      ...typography.h1,
      color: colors.textPrimary,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: "600",
      letterSpacing: 0.6,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardPadded: {
      padding: spacing.md,
    },
    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.md,
      padding: spacing.md,
    },
    avatarWrapper: {
      position: "relative",
    },
    changePhotoButton: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    changePhotoButtonDisabled: {
      opacity: 0.5,
    },
    heroTexts: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 6,
    },
    userName: {
      ...typography.h2,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    verifiedBadge: {
      marginLeft: 2,
    },
    userEmail: {
      ...typography.body,
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      height: 46,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      ...typography.body,
      color: colors.textPrimary,
      marginBottom: 14,
    },
    textArea: {
      height: 110,
      paddingTop: 12,
      textAlignVertical: "top",
      marginBottom: 0,
    },
    privacyRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 12,
    },
    privacyIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    privacyTitle: {
      flex: 1,
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    privacyHint: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    privacyStatus: {
      ...typography.caption,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    privacyStatusOn: {
      color: colors.accent,
    },
    saveButton: {
      marginTop: spacing.lg,
    },
  });
