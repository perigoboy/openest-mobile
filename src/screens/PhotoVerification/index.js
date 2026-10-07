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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { VerifiedBadge, useToast } from "../../components";
import { colors, spacing, typography } from "../../styles/theme";
import api from "../../services/api";
import { submitSelfieForVerification } from "../../services/verification";

// Passos exibidos no cartão de instruções.
const STEPS = [
  "Tire uma selfie com a câmera frontal, de frente e com boa luz.",
  "A foto é comparada com as fotos do seu perfil para confirmar que é você.",
  "Aprovada a selfie, o selo Verificado aparece no seu perfil e no card.",
];

export default function PhotoVerification({ navigation }) {
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
    <LinearGradient colors={["#2c003e", "#1a0026", "#0d0012"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Cabeçalho com volta para as Configurações */}
          <View style={styles.header}>
            <TouchableOpacity
              testID="btn-go-back"
              style={styles.backButton}
              onPress={handleGoBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Verificação de Foto</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={styles.loadingText}>Consultando seu status...</Text>
            </View>
          ) : verificado ? (
            /* ---------------- Já verificado: selo + estado final --------------- */
            <View style={styles.card} testID="panel-verificado">
              <View style={styles.successIcon}>
                <Ionicons name="shield-checkmark" size={36} color={colors.success} />
              </View>
              <VerifiedBadge />
              <Text style={styles.cardTitle}>Seu perfil está verificado</Text>
              <Text style={styles.cardText}>
                A selfie foi conferida com as fotos do seu perfil. O selo Verificado
                já aparece no seu perfil e nos cards do Discovery.
              </Text>
              <TouchableOpacity
                testID="btn-reverify"
                style={styles.secondaryButtonWrapper}
                onPress={handleReverify}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>REFIZER VERIFICAÇÃO</Text>
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
                    style={styles.primaryButtonWrapper}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={["#7b2cbf", "#5a189a", "#3c096c"]}
                      style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>ENVIAR SELFIE</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="btn-retake-selfie"
                    style={styles.secondaryButtonWrapper}
                    onPress={handleRetake}
                    disabled={submitting}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>TIRAR OUTRA SELFIE</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  testID="btn-take-selfie"
                  style={styles.primaryButtonWrapper}
                  onPress={handleTakeSelfie}
                  disabled={capturing}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={["#7b2cbf", "#5a189a", "#3c096c"]}
                    style={[styles.primaryButton, capturing && styles.buttonDisabled]}
                  >
                    {capturing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={18} color="#fff" />
                        <Text style={[styles.primaryButtonText, styles.buttonTextWithIcon]}>
                          TIRAR SELFIE
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  screenTitle: {
    ...typography.h2,
    color: "#fff",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: "#d7b8e8",
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },
  cardTitle: {
    ...typography.h3,
    color: "#2d3436",
    marginBottom: spacing.sm,
    textAlign: "center",
    alignSelf: "stretch",
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#636e72",
    marginTop: spacing.sm,
    textAlign: "center",
    alignSelf: "stretch",
  },
  successIcon: {
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#576574",
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    padding: spacing.md,
    alignItems: "center",
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#f1f2f6",
  },
  previewHint: {
    ...typography.caption,
    color: "#636e72",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  primaryButtonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  primaryButton: {
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  buttonTextWithIcon: {
    marginLeft: spacing.sm,
  },
  secondaryButtonWrapper: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
    alignSelf: "stretch",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#636e72",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

