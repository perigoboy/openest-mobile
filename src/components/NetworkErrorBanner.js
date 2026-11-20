// src/components/NetworkErrorBanner.js
// T050 — Banner padronizado para falhas de rede/timeout, com "Tentar novamente".
// Fica montado uma única vez no App.js e escuta a fila de requisições que
// falharam (src/services/networkErrors.js). Enquanto ele existir, nenhuma
// tela precisa tratar "sem internet" sozinha.
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NETWORK_ERROR_KIND,
  dismissFailedRequests,
  retryFailedRequests,
  subscribeNetworkErrors,
} from "../services/networkErrors";
import { radius, spacing, typography } from "../styles/theme";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

export default function NetworkErrorBanner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState({ visible: false, kind: null, count: 0 });

  useEffect(() => subscribeNetworkErrors(setState), []);

  if (!state.visible) return null;

  const offline = state.kind === NETWORK_ERROR_KIND.OFFLINE;

  return (
    <View
      testID="network-error-banner"
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      {/* role/liveRegion no texto (e não no container): assim o leitor de
          tela anuncia o aviso E os dois botões continuam focáveis. */}
      <View style={styles.banner}>
        <Ionicons
          name={offline ? "cloud-offline-outline" : "time-outline"}
          size={22}
          color={colors.warning}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text
          style={styles.message}
          testID="network-error-message"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {state.message}
        </Text>
        <TouchableOpacity
          testID="network-error-retry"
          style={styles.retry}
          onPress={retryFailedRequests}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="network-error-dismiss"
          style={styles.dismiss}
          onPress={dismissFailedRequests}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de erro de conexão"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    elevation: 1000,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    rowGap: spacing.sm,
    columnGap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minWidth: 140,
  },
  retry: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  retryText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  dismiss: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
