// src/components/AttachmentMenu.js
// Front — menu do botão "+" da barra de mensagem: Foto, Localização e GIF
// (as mesmas 3 ações do web).
import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../styles/theme";

const OPTIONS = [
  { key: "photo", icon: "image", label: "Enviar Foto", emoji: "📸" },
  { key: "location", icon: "location", label: "Partilhar Localização", emoji: "📍" },
  { key: "gif", icon: "film", label: "Enviar GIF", emoji: "🎬" },
];

export default function AttachmentMenu({ visible, onClose, onSelect }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="attachment-backdrop">
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.handle} />
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              testID={`attachment-${opt.key}`}
              style={styles.option}
              activeOpacity={0.7}
              onPress={() => onSelect(opt.key)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={opt.icon} size={22} color={colors.primaryLight} />
              </View>
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: spacing.md,
    paddingVertical: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    ...typography.body,
    color: colors.text,
  },
});
