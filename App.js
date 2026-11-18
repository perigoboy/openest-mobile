import "react-native-gesture-handler"; // precisa ser o 1º import do arquivo
import React from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";

import Routes from "./src/routes";
import linking from "./src/routes/linking";
import { navigationRef } from "./src/routes/navigationRef";
import { ToastProvider } from "./src/components";
import NetworkErrorBanner from "./src/components/NetworkErrorBanner";
import InAppNotificationBanner from "./src/components/InAppNotificationBanner";
import { AuthProvider } from "./src/contexts/AuthContext";
import { RealtimeProvider } from "./src/contexts/RealtimeContext";
import { configureNotificationHandler, isExpoGo } from "./src/services/notifications";
import { colors } from "./src/styles/theme";

// T051 — mantém a SplashScreen nativa até o AuthContext decidir a rota
// (escondida em src/routes/index.js). O fade deixa a transição suave.
SplashScreen.preventAutoHideAsync().catch(() => {});
// Front-2 — setOptions gera warning no Expo Go; só aplica fora dele.
if (!isExpoGo()) {
  try {
    SplashScreen.setOptions({ duration: 400, fade: true });
  } catch {
    // módulo nativo indisponível — sem efeito
  }
}

// T048 — decide se uma notificação recebida com o app aberto aparece
// (não aparece se a conversa dela já estiver aberta na tela).
configureNotificationHandler();

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
    // T032 — root obrigatório do react-native-gesture-handler: sem ele
    // os gestos (ex.: swipe do card de Descoberta) não são reconhecidos.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            {/* T045/T048 — socket + push acompanham o login */}
            <RealtimeProvider>
              {/* T049 — deep links (openest://chat/<id>) e toque em notificação */}
              <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
                <StatusBar style="light" />
                <Routes />
              </NavigationContainer>
              {/* Front-1 — banner in-app (mensagem/match) estilo Instagram */}
              <InAppNotificationBanner />
            </RealtimeProvider>
          </AuthProvider>
          {/* T050 — aviso global de falha de rede com "Tentar novamente" */}
          <NetworkErrorBanner />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
