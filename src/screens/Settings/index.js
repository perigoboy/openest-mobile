// src/screens/Settings/index.js
// T025 — Tela de Configurações.
// Centraliza em um único menu todas as ações de conta do app:
//   • Notificações        — preferência local (assinatura push real é a T048)
//   • Alterar senha       — modal com validação (rota da API ainda não existe, ver TODO)
//   • Verificação de foto — fluxo de selfie é a T023
//   • Meus dados (LGPD)   — portabilidade/exclusão de conta é a T024
//   • Sair                — logout ligado ao signOut do AuthContext (T009)
//
// Visual segue o mesmo padrão da tela de Perfil (T018): fundo em gradiente
// roxo escuro, cartões brancos e botões com gradiente.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components";
import { colors, spacing, typography } from "../../styles/theme";

// Chave da preferência de notificações salva no SecureStore (só aceita strings).
const NOTIFICATIONS_KEY = "notifications_enabled";
const MIN_PASSWORD_LENGTH = 6;

// Linha de menu reutilizada pelos grupos da tela.
function MenuRow({ testID, icon, title, subtitle, onPress, right }) {
  const content = (
    <>
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.rowIcon} />
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {right ? right : <Ionicons name="chevron-forward" size={18} color="#b2bec3" />}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <TouchableOpacity
      testID={testID}
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

export default function Settings() {
  const { signOut } = useAuth();
  const toast = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Carrega a preferência salva (padrão: ativadas).
  useEffect(() => {
    let mounted = true;
    async function loadPreference() {
      try {
        const stored = await SecureStore.getItemAsync(NOTIFICATIONS_KEY);
        if (mounted && stored !== null && stored !== undefined) {
          setNotificationsEnabled(stored === "true");
        }
      } catch (error) {
        console.error("Erro ao carregar preferência de notificações:", error);
      }
    }
    loadPreference();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleToggleNotifications(value) {
    setNotificationsEnabled(value);
    try {
      await SecureStore.setItemAsync(NOTIFICATIONS_KEY, String(value));
    } catch (error) {
      console.error("Erro ao salvar preferência de notificações:", error);
    }
    // TODO(T048): ao ativar, solicitar permissão e inscrever o token no push
    // via expo-notifications; ao desativar, cancelar a inscrição.
  }

  function handleClosePasswordModal() {
    setPasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleChangePassword() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Atenção", "Por favor, preencha todos os campos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        "Atenção",
        `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
      );
      return;
    }

    // TODO(backend): a rota de alteração de senha ainda não existe na API.
    // Quando o endpoint for criado, substituir este bloco por:
    //   await api.patch('/api/users/change-password', { currentPassword, newPassword });
    // e tratar o erro com Alert.alert('Erro', mensagem do servidor).
    Alert.alert("Em breve", "A alteração de senha estará disponível em breve.");
    handleClosePasswordModal();
  }

  function handlePhotoVerification() {
    // TODO(T023): quando a tela de selfie existir, navegar para ela
    // (navigation.navigate('PhotoVerification')).
    toast.show("Em breve: a verificação de foto estará disponível nesta tela.", {
      type: "info",
    });
  }

  function handleDataPrivacy() {
    // TODO(T024): quando as ações de portabilidade/exclusão existirem, navegar
    // para a tela de privacidade (navigation.navigate('DataPrivacy')).
    toast.show("Em breve: exclusão de conta e portabilidade de dados.", {
      type: "info",
    });
  }

  function handleSignOut() {
    Alert.alert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            // Limpa token/usuário do SecureStore; a troca para AuthRoutes
            // acontece sozinha via src/routes/index.js.
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }
  return (
    <LinearGradient colors={["#2c003e", "#1a0026", "#0d0012"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Topo / Logo + título */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>OPENEST</Text>
            <Text style={styles.screenTitle}>Configurações</Text>
          </View>

          {/* Grupo: Preferências */}
          <Text style={styles.sectionTitle}>PREFERÊNCIAS</Text>
          <View style={styles.card}>
            <MenuRow
              testID="row-notifications"
              icon="notifications-outline"
              title="Notificações"
              subtitle="Alertas de novos matches e mensagens"
              right={
                <Switch
                  testID="switch-notifications"
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: "#b2bec3", true: colors.primaryLight }}
                  thumbColor={colors.white}
                />
              }
            />
          </View>

          {/* Grupo: Conta */}
          <Text style={styles.sectionTitle}>CONTA</Text>
          <View style={styles.card}>
            <MenuRow
              testID="btn-change-password"
              icon="lock-closed-outline"
              title="Alterar senha"
              subtitle="Atualize a senha da sua conta"
              onPress={() => setPasswordModalVisible(true)}
            />
            <View style={styles.divider} />
            <MenuRow
              testID="btn-photo-verification"
              icon="camera-outline"
              title="Verificação de foto"
              subtitle="Envie uma selfie para confirmar seu perfil"
              onPress={handlePhotoVerification}
            />
            <View style={styles.divider} />
            <MenuRow
              testID="btn-data-privacy"
              icon="shield-checkmark-outline"
              title="Meus dados (LGPD)"
              subtitle="Baixar meus dados ou excluir a conta"
              onPress={handleDataPrivacy}
            />
          </View>

          {/* Grupo: Sessão */}
          <Text style={styles.sectionTitle}>SESSÃO</Text>
          <TouchableOpacity
            testID="btn-signout"
            style={styles.signOutWrapper}
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            disabled={signingOut}
          >
            <LinearGradient colors={["#e74c3c", "#c0392b"]} style={styles.signOutButton}>
              <Text style={styles.signOutText}>{signingOut ? "SAINDO..." : "SAIR"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Modal: alterar senha */}
      {passwordModalVisible && (
        <Modal
          visible={passwordModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleClosePasswordModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Alterar Senha</Text>

              <Text style={styles.modalLabel}>Senha atual</Text>
              <TextInput
                testID="input-current-password"
                style={styles.modalInput}
                placeholder="Sua senha atual"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={styles.modalLabel}>Nova senha</Text>
              <TextInput
                testID="input-new-password"
                style={styles.modalInput}
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.modalLabel}>Confirmar nova senha</Text>
              <TextInput
                testID="input-confirm-password"
                style={styles.modalInput}
                placeholder="Repita a nova senha"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                testID="btn-submit-password"
                style={styles.modalButtonWrapper}
                onPress={handleChangePassword}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <LinearGradient colors={["#7b2cbf", "#5a189a", "#3c096c"]} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>SALVAR</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-cancel-password"
                style={styles.cancelButton}
                onPress={handleClosePasswordModal}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
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
  screenTitle: {
    ...typography.h2,
    color: "#fff",
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: "#d7b8e8",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  rowIcon: { marginRight: spacing.md },
  rowTexts: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2d3436",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#636e72",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#ebedf0",
    marginLeft: 56,
  },
  signOutWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  signOutButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: "#2d3436",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#576574",
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: "#f1f2f6",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    marginBottom: spacing.md,
    color: "#2d3436",
  },
  modalButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  modalButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  cancelButton: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: 14,
    color: "#636e72",
    fontWeight: "600",
  },
});




