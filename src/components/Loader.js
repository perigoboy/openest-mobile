// Indicador de carregamento. Em tela cheia (enquanto o app decide a rota),
// mostra a marca sobre o fundo do tema — sem degradê nem cartão de vidro.
import React from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";

export default function Loader({ fullScreen = false, size = "large" }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <Image
          source={require("../../assets/logo-chama.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <ActivityIndicator size={size} color={colors.accent} style={styles.spinner} accessibilityLabel="Carregando" />
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={colors.primary} accessibilityLabel="Carregando" />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    fullScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    logo: {
      width: 72,
      height: 72,
    },
    spinner: {
      marginTop: 24,
    },
    inline: {
      paddingVertical: 24,
      alignItems: "center",
      justifyContent: "center",
    },
  });
