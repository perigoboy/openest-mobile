import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { spacing, radius, typography } from "../styles/theme";
import { tapLight } from "../utils/haptics";

function variantColors(variant, colors) {
  switch (variant) {
    case "outline":
      return { bg: "transparent", text: colors.accent, border: colors.border, pressed: colors.surfaceMuted };
    case "secondary":
      return { bg: colors.primarySoft, text: colors.accent, border: "transparent", pressed: colors.primarySoft };
    case "danger":
      return { bg: colors.dangerDark, text: colors.white, border: "transparent", pressed: colors.danger };
    case "primary":
    default:
      return { bg: colors.primary, text: colors.onPrimary, border: "transparent", pressed: colors.primaryPressed };
  }
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  ...rest
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const v = variantColors(variant, colors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={(event) => {
        tapLight();
        onPress?.(event);
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const createStyles = () =>
  StyleSheet.create({
    base: {
      height: 50,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    pressed: {
      transform: [{ scale: 0.985 }],
    },
    text: {
      ...typography.bodyStrong,
      fontSize: 16,
    },
    disabled: {
      opacity: 0.5,
    },
  });
