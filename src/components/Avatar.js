import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { useThemedStyles } from "../contexts/ThemeContext";

function getInitials(name = "") {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Avatar({ uri, name, size = 56, style }) {
  const styles = useThemedStyles(createStyles);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension, style]} accessibilityIgnoresInvertColors />;
  }

  return (
    <View style={[styles.fallback, dimension, style]}>
      <Text style={[styles.initials, { fontSize: Math.round(size / 2.6) }]}>
        {getInitials(name) || "?"}
      </Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    image: {
      backgroundColor: colors.surfaceMuted,
    },
    // Iniciais em roxo sobre fundo tingido: mais leve que um disco roxo sólido.
    fallback: {
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
