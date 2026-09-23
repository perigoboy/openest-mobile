import "react-native-gesture-handler"; // precisa ser o 1º import do arquivo
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";

import Routes from "./src/routes";
import { ToastProvider } from "./src/components";
import { AuthProvider } from "./src/contexts/AuthContext";
import { colors } from "./src/styles/theme";

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="light" />
            <Routes />
          </NavigationContainer>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
