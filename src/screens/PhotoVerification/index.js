// src/screens/PhotoVerification/index.js
// T023 — Verificação de selfie (selo "Verificado").
//
// Fluxo aberto a partir das Configurações (item "Verificação de foto"):
//   1. Pede permissão da câmera e captura uma SELFIE na câmera frontal
//      (expo-image-picker — mesma dependência do T020; expo-camera não é
//      dependência do projeto).
//   2. Mostra a prévia e, ao confirmar, dispara POST /api/users/verify-photo
//      com a imagem em FormData (campo "image", padrão do multer no backend).
//   3. Aprovada a selfie, o selo "Verificado" é exibido aqui e passa a
//      aparecer no Perfil (T018) e no Card do Discovery.
//
// Visual segue o padrão das telas T018/T025: fundo em gradiente roxo,
// cartões brancos e botões com gradiente.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { VerifiedBadge, useToast } from "../../components";
import { radius, spacing, typography } from "../../styles/theme";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import api from "../../services/api";
import { submitSelfieForVerification } from "../../services/verification";

// Passos exibidos no cartão de instruções.
const STEPS = [
  "Tire uma selfie com a câmera frontal, de frente e com boa luz.",
  "A foto é comparada com as fotos do seu perfil para confirmar que é você.",
  "Aprovada a selfie, o selo Verificado aparece no seu perfil e no card.",
];

export default function PhotoVerification({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();

  // Status atual vindo do banco (GET /api/users/perfil → verificado).
  const [verificado, setVerificado] = useState(false);
  const [loading, setLoading] = useState(true);

  // Selfie capturada (ainda não enviada) e travas de carregamento.
  const [selfieUri, setSelfieUri] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Consulta se o usuário já está verificado (pode ter sido antes).
  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const response = await api.get("/api/users/perfil");
        if (mounted && response.data) {
          setVerificado(response.data.verificado === true);
        }
      } catch (error) {
        console.error("Erro ao consultar status de verificação:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);
  // Abre a câmera frontal e guarda a selfie para revisão antes do envio.
  async function handleTakeSelfie() {
    if (capturing || submitting) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão negada",
          "Precisamos de permissão para usar a câmera e verificar seu rosto."
        );
        return;
      }

      setCapturing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.front, // selfie
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      setSelfieUri(result.assets[0].uri);
    } catch (error) {
      console.error("Erro ao capturar selfie:", error);
      Alert.alert("Erro", "Não foi possível capturar a selfie.");
    } finally {
      setCapturing(false);
    }
  }

  // Volta para a tela anterior (aba Configurações).
  function handleGoBack() {
    if (navigation && typeof navigation.goBack === "function") {
      navigation.goBack();
    }
  }

  // Descarta a selfie mostrada e permite tirar outra.
  function handleRetake() {
    if (submitting) return;
    setSelfieUri("");
  }

  // Envia a selfie para POST /api/users/verify-photo e aplica o selo na aprovação.
  async function handleSubmit() {
    if (!selfieUri || submitting) return;

    setSubmitting(true);
    try {
      const result = await submitSelfieForVerification(selfieUri, {
        fileName: `selfie-${Date.now()}.jpg`,
      });

      if (result.verificado) {
        setVerificado(true);
        setSelfieUri("");
        toast.show(result.message || "Selfie aprovada! Selo Verificado ativado.", {
          type: "success",
        });
      } else {
        Alert.alert(
          "Em análise",
          "Recebemos sua selfie. O selo Verificado será ativado após a confirmação."
        );
      }
    } catch (error) {
      console.error("Erro ao enviar selfie de verificação:", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível enviar a selfie para verificação.";
      Alert.alert("Erro", message);
    } finally {
      setSubmitting(false);
    }
  }

  // Reinicia o fluxo para quem já está verificado e quer atualizar a selfie.
  function handleReverify() {
    setVerificado(false);
    setSelfieUri("");
  }
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="btn-go-back"
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle} accessibilityRole="header">Verificação de Foto</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Consultando seu status...</Text>
          </View>
        ) : verificado ? (
          /* ---------------- Já verificado: selo + estado final --------------- */
          <View style={styles.card} testID="panel-verificado">
            <View style={styles.successIcon}>
              <Ionicons name="shield-checkmark" size={32} color={colors.successText} />
            </View>
            <VerifiedBadge />
            <Text style={styles.cardTitle}>Seu perfil está verificado</Text>
            <Text style={styles.cardText}>
              A selfie foi conferida com as fotos do seu perfil. O selo Verificado
              já aparece no seu perfil e nos cards do Discovery.
            </Text>
            <TouchableOpacity
              testID="btn-reverify"
              style={styles.secondaryButton}
              onPress={handleReverify}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Refazer verificação</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ---------------- Ainda não verificado: captura + envio ----------- */
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Como funciona</Text>
              {STEPS.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {selfieUri ? (
              <View style={styles.previewCard}>
                <Image
                  testID="image-selfie-preview"
                  source={{ uri: selfieUri }}
                  style={styles.previewImage}
                />
                <Text style={styles.previewHint}>
                  Confira se o rosto está nítido antes de enviar.
                </Text>

                <TouchableOpacity
                  testID="btn-submit-selfie"
                  style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Enviar selfie</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  testID="btn-retake-selfie"
                  style={styles.secondaryButton}
                  onPress={handleRetake}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>Tirar outra selfie</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                testID="btn-take-selfie"
                style={[styles.primaryButton, capturing && styles.buttonDisabled]}
                onPress={handleTakeSelfie}
                disabled={capturing}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                {capturing ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={18} color={colors.onPrimary} />
                    <Text style={[styles.primaryButtonText, styles.buttonTextWithIcon]}>Tirar selfie</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xs,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    screenTitle: { ...typography.h3, color: colors.textPrimary },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xl, rowGap: spacing.md },
    loadingBox: { alignItems: "center", paddingVertical: spacing.xl, rowGap: spacing.sm },
    loadingText: { ...typography.body, color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "stretch",
      rowGap: spacing.sm,
    },
    successIcon: {
      alignSelf: "center",
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.successSoft,
    },
    cardTitle: { ...typography.h3, color: colors.textPrimary },
    cardText: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    stepRow: { flexDirection: "row", alignItems: "center", columnGap: 12 },
    stepNumber: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    stepNumberText: { ...typography.label, color: colors.accent },
    stepText: { flex: 1, ...typography.body, fontSize: 14, color: colors.textPrimary },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center",
      rowGap: spacing.sm,
    },
    previewImage: { width: 200, height: 200, borderRadius: 100, backgroundColor: colors.surfaceMuted },
    previewHint: { ...typography.caption, fontSize: 13, color: colors.textSecondary, textAlign: "center" },
    primaryButton: {
      alignSelf: "stretch",
      height: 50,
      borderRadius: radius.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    primaryButtonText: { ...typography.bodyStrong, fontSize: 16, color: colors.onPrimary },
    buttonTextWithIcon: { marginLeft: 8 },
    buttonDisabled: { opacity: 0.6 },
    secondaryButton: {
      alignSelf: "stretch",
      height: 46,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { ...typography.bodyStrong, color: colors.accent },
  });
