import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { spacing, radius, typography } from "../styles/theme";

// `secureToggle`: em campos de senha, mostra o botão de exibir/ocultar.
export default function Input({
  label,
  error,
  containerStyle,
  secureToggle = false,
  ...textInputProps
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = !!textInputProps.secureTextEntry;
  const showToggle = secureToggle && isSecure;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View>
      <TextInput
        // T052 — sem rótulo explícito, o leitor de tela usa o label visível
        // (ou o placeholder) para anunciar o campo.
        accessibilityLabel={label || textInputProps.placeholder}
        accessibilityHint={error || undefined}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          showToggle && styles.inputWithToggle,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...textInputProps}
        secureTextEntry={isSecure && !revealed}
      />
      {showToggle ? (
        <Pressable
          testID={textInputProps.testID ? `${textInputProps.testID}-toggle` : undefined}
          style={styles.toggle}
          onPress={() => setRevealed((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
          hitSlop={8}
        >
          <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      height: 50,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      paddingHorizontal: spacing.md,
      color: colors.textPrimary,
      ...typography.body,
    },
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: colors.danger,
    },
    inputWithToggle: {
      paddingRight: 48,
    },
    toggle: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
  });
