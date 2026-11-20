// Gaveta inferior (bottom sheet) estilo WhatsApp/iOS: fundo escurecido,
// alça no topo, cantos arredondados e respiro da área segura.
//
// <BottomSheet>          → container genérico (qualquer conteúdo)
// <ActionSheet options>  → lista de ações com ícone vetorial, usada no menu
//                          de anexos, nas ações da mensagem e na foto do perfil.
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { radius, spacing, typography } from "../styles/theme";
import { selectionTick } from "../utils/haptics";

export function BottomSheet({ visible, onClose, title, subtitle, children, testID }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} testID={testID}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          testID={testID ? `${testID}-backdrop` : "bottom-sheet-backdrop"}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

// options: [{ key, label, icon, description?, destructive?, onPress, testID? }]
export function ActionSheet({ visible, onClose, title, subtitle, options = [], testID, cancelLabel = "Cancelar" }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} testID={testID}>
      <View style={styles.list}>
        {options.map((option) => {
          const tint = option.destructive ? colors.danger : colors.accent;
          return (
            <Pressable
              key={option.key}
              testID={option.testID || `action-${option.key}`}
              onPress={() => {
                selectionTick();
                onClose?.();
                option.onPress?.();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <View style={[styles.iconWrap, option.destructive && styles.iconWrapDanger]}>
                <Ionicons name={option.icon} size={20} color={tint} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={[styles.rowLabel, option.destructive && { color: colors.danger }]}>
                  {option.label}
                </Text>
                {option.description ? <Text style={styles.rowDescription}>{option.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        testID={testID ? `${testID}-cancel` : "action-cancel"}
        onPress={onClose}
        style={({ pressed }) => [styles.cancel, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      >
        <Text style={styles.cancelText}>{cancelLabel}</Text>
      </Pressable>
    </BottomSheet>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    sheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    header: {
      paddingHorizontal: spacing.xs,
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    list: {
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapDanger: {
      backgroundColor: colors.scheme === "dark" ? "#3A1A21" : "#FDECEC",
    },
    rowTexts: {
      flex: 1,
    },
    rowLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    rowDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    cancel: {
      marginTop: spacing.sm,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    cancelText: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
  });

export default BottomSheet;
