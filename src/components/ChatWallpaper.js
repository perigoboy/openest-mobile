// Fundo do chat com textura sutil (estilo WhatsApp), adaptada ao tema.
// Um único tile transparente é repetido e tingido com a cor do tema.
import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const PATTERN = require("../../assets/chat-pattern.png");

export default function ChatWallpaper({ children, style, testID = "chat-wallpaper" }) {
  const { colors, isDark } = useTheme();
  return (
    <ImageBackground
      testID={testID}
      source={PATTERN}
      resizeMode="repeat"
      style={[styles.fill, { backgroundColor: colors.chatBackground }, style]}
      imageStyle={{ tintColor: colors.chatPattern, opacity: isDark ? 0.08 : 0.07 }}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
