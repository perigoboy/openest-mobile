// src/screens/Settings/index.js
// T025 — Tela de Configurações.
// Centraliza em um único menu todas as ações de conta do app:
//   • Notificações        — preferência local (assinatura push real é a T048)
//   • Alterar senha       — modal com validação (rota da API ainda não existe, ver TODO)
//   • Verificação de foto — abre a tela de selfie (T023)
//   • Meus dados (LGPD)   — baixar dados (GET) e excluir conta (DELETE) — T024
//   • Sair                — logout ligado ao signOut do AuthContext (T009)
//
// Visual: lista agrupada estilo ajustes do iOS/WhatsApp, acompanhando o tema
// claro/escuro. A seção Aparência traz o seletor Claro/Escuro/Automático.

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
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { setNotificationsEnabledAsync } from "../../services/notifications"; // T048
import * as Sharing from "expo-sharing"; // T024 — abre a folha de compartilhamento
import { File, Paths } from "expo-file-system"; // T024 — grava o JSON exportado
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components";
import ThemeSelector from "../../components/ThemeSelector";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { radius, spacing, typography } from "../../styles/theme";

// Chave da preferência de notificações salva no SecureStore (só aceita strings).
const NOTIFICATIONS_KEY = "notifications_enabled";
const MIN_PASSWORD_LENGTH = 6;

// Linha de menu reutilizada pelos grupos da tela.
function MenuRow({ testID, icon, title, subtitle, onPress, right, destructive }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const content = (
    <>
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.dangerText : colors.accent} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={[styles.rowTitle, destructive && { color: colors.dangerText }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}

export default function Settings({ navigation }) {
  const { signOut } = useAuth();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // T024 — LGPD: modal de portabilidade/exclusão + travas de carregamento.
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    // T048 — ao ativar, pede permissão e registra o token de push na API;
    // ao desativar, remove o token (o aparelho para de receber push).
    await setNotificationsEnabledAsync(value);
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
    // T023 — abre a tela de captura/validação da selfie (rota registrada
    // em AppRoutes.js, fora da tab bar visível).
    if (navigation && typeof navigation.navigate === "function") {
      navigation.navigate("PhotoVerification");
    }
  }

  // T024 — LGPD: abre o modal com portabilidade e exclusão de conta.
  function handleDataPrivacy() {
    setPrivacyModalVisible(true);
  }

  function handleClosePrivacyModal() {
    if (exporting || deleting) return;
    setPrivacyModalVisible(false);
  }

  // T024 — "Baixar meus dados": GET /api/users/exportar-dados, grava o JSON
  // em um arquivo no cache e abre a folha de compartilhamento do sistema
  // (Salvar nos arquivos, WhatsApp, e-mail...) — padrão de portabilidade no mobile.
  async function handleExportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await api.get("/api/users/exportar-dados");
      const conteudo = JSON.stringify(response.data, null, 2);

      const file = new File(Paths.cache, `dados_openest_${Date.now()}.json`);
      file.create({ overwrite: true, intermediates: true });
      file.write(conteudo);

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Baixar meus dados",
          UTI: "public.json",
        });
        toast.show("Dados exportados! Escolha onde salvar o arquivo.", {
          type: "success",
        });
      } else {
        toast.show("Compartilhamento indisponível neste dispositivo.", {
          type: "error",
        });
      }
    } catch (error) {
      console.error("Erro ao exportar dados (LGPD):", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível exportar seus dados.";
      Alert.alert("Erro", message);
    } finally {
      setExporting(false);
    }
  }

  // T024 — "Excluir conta": depois da confirmação a ação é irrevogável —
  // DELETE /api/users/conta (soft delete + anonimização no backend) e, em
  // seguida, signOut() limpa token/usuário do SecureStore (troca de rota
  // para AuthRoutes acontece sozinha via src/routes/index.js).
  function handleDeleteAccount() {
    if (deleting) return;
    Alert.alert(
      "Excluir conta",
      "Esta ação é definitiva: sua conta será excluída e os dados anonimizados. Não é possível desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    try {
      const response = await api.delete("/api/users/conta");
      // Sessão limpa imediatamente após a exclusão confirmada.
      await signOut();
      Alert.alert(
        "Conta excluída",
        (response && response.data && response.data.message) ||
          "Sua conta foi excluída com sucesso."
      );
    } catch (error) {
      console.error("Erro ao excluir conta (LGPD):", error);
      const message =
        (error && error.response && error.response.data && error.response.data.error) ||
        "Não foi possível excluir a conta.";
      Alert.alert("Erro", message);
    } finally {
      setDeleting(false);
    }
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle} accessibilityRole="header">Configurações</Text>

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
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.border}
              />
            }
          />
        </View>

        {/* Grupo: Aparência (tema) */}
        <Text style={styles.sectionTitle}>APARÊNCIA</Text>
        <View style={[styles.card, styles.cardPadded]}>
          <ThemeSelector />
          <Text style={styles.cardHint}>
            Automático acompanha o tema do seu celular. A escolha fica salva neste aparelho.
          </Text>
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
        <View style={styles.card}>
          <Pressable
            testID="btn-signout"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            disabled={signingOut}
          >
            <View style={[styles.rowIcon, styles.rowIconDanger]}>
              <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
            </View>
            <Text style={[styles.rowTitle, styles.signOutText]}>{signingOut ? "Saindo..." : "Sair da conta"}</Text>
          </Pressable>
        </View>
      </ScrollView>

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
                accessibilityLabel="Senha atual"
                testID="input-current-password"
                style={styles.modalInput}
                placeholder="Sua senha atual"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                secureTextEntry
                autoCapitalize="none"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={styles.modalLabel}>Nova senha</Text>
              <TextInput
                accessibilityLabel="Nova senha"
                testID="input-new-password"
                style={styles.modalInput}
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.modalLabel}>Confirmar nova senha</Text>
              <TextInput
                accessibilityLabel="Confirmar nova senha"
                testID="input-confirm-password"
                style={styles.modalInput}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <Pressable
                testID="btn-submit-password"
                style={({ pressed }) => [styles.modalButton, pressed && { backgroundColor: colors.primaryPressed }]}
                onPress={handleChangePassword}
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonText}>Salvar</Text>
              </Pressable>

              <Pressable
                testID="btn-cancel-password"
                style={styles.cancelButton}
                onPress={handleClosePasswordModal}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Modal: meus dados (LGPD) — T024 */}
      {privacyModalVisible && (
        <Modal
          visible={privacyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleClosePrivacyModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Meus dados (LGPD)</Text>
              <Text style={styles.privacyText}>
                Baixe uma cópia de todos os seus dados ou exclua sua conta
                definitivamente. A exclusão é imediata e não pode ser desfeita.
              </Text>

              <Pressable
                testID="btn-download-data"
                style={({ pressed }) => [styles.modalButton, pressed && { backgroundColor: colors.primaryPressed }]}
                onPress={handleExportData}
                disabled={exporting || deleting}
                accessibilityRole="button"
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.modalButtonText}>Baixar meus dados</Text>
                )}
              </Pressable>

              <Pressable
                testID="btn-delete-account"
                style={({ pressed }) => [styles.modalButton, styles.deleteButton, pressed && { opacity: 0.85 }]}
                onPress={handleDeleteAccount}
                disabled={exporting || deleting}
                accessibilityRole="button"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Excluir conta</Text>
                )}
              </Pressable>

              <Pressable
                testID="btn-cancel-privacy"
                style={styles.cancelButton}
                onPress={handleClosePrivacyModal}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Fechar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    screenTitle: {
      ...typography.h1,
      color: colors.textPrimary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
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
      overflow: "hidden",
    },
    cardPadded: {
      padding: spacing.md,
    },
    cardHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      minHeight: 60,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    rowIconDanger: {
      backgroundColor: colors.dangerSoft,
    },
    rowTexts: { flex: 1 },
    rowTitle: {
      ...typography.body,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    rowSubtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginLeft: spacing.md + 32 + 12,
    },
    signOutText: {
      color: colors.dangerText,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    modalLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: colors.inputBg,
      height: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      ...typography.body,
      marginBottom: spacing.md,
      color: colors.textPrimary,
    },
    modalButton: {
      height: 48,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
      marginTop: spacing.xs,
    },
    modalButtonText: {
      ...typography.bodyStrong,
      color: colors.onPrimary,
    },
    deleteButton: {
      backgroundColor: colors.dangerDark,
      marginTop: spacing.sm,
    },
    deleteButtonText: {
      color: "#FFFFFF",
    },
    cancelButton: {
      marginTop: spacing.md,
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    cancelText: {
      ...typography.bodyStrong,
      color: colors.textSecondary,
    },
    // T024 — modal de LGPD
    privacyText: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
  });
