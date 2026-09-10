import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../styles/theme";

export default function Loader({ fullScreen = false, size = "large" }) {
  return (
    <View style={fullScreen ? styles.fullScreen : styles.inline}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  inline: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
