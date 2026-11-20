import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { spacing, radius, typography } from "../styles/theme";

export default function Input({
  label,
  error,
  containerStyle,
  ...textInputProps
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

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
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...textInputProps}
      />

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
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
  });
