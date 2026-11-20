import "react-native-gesture-handler"; // precisa ser o 1º import do arquivo
import React from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";

import Routes from "./src/routes";
import linking from "./src/routes/linking";
import { navigationRef } from "./src/routes/navigationRef";
import { ToastProvider } from "./src/components";
import NetworkErrorBanner from "./src/components/NetworkErrorBanner";
import InAppNotificationBanner from "./src/components/InAppNotificationBanner";
import { AuthProvider } from "./src/contexts/AuthContext";
import { RealtimeProvider } from "./src/contexts/RealtimeContext";
import { configureNotificationHandler, isExpoGo } from "./src/services/notifications";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";

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

// Tema do React Navigation acompanha o tema do app: sem "flash" branco
// entre telas no modo escuro, nem fundo preto no modo claro.
function buildNavigationTheme(colors, isDark) {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
  };
}

function ThemedNavigation({ children }) {
  const { colors, isDark } = useTheme();
  const navigationTheme = React.useMemo(() => buildNavigationTheme(colors, isDark), [colors, isDark]);
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
      {/* Ícones da status bar escuros no tema claro e claros no escuro */}
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    // T032 — root obrigatório do react-native-gesture-handler: sem ele
    // os gestos (ex.: swipe do card de Descoberta) não são reconhecidos.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {/* T045/T048 — socket + push acompanham o login */}
            <RealtimeProvider>
              {/* T049 — deep links (openest://chat/<id>) e toque em notificação */}
              <ThemedNavigation>
                <Routes />
              </ThemedNavigation>
              {/* Front-1 — banner in-app (mensagem/match) estilo Instagram */}
              <InAppNotificationBanner />
            </RealtimeProvider>
          </AuthProvider>
          {/* T050 — aviso global de falha de rede com "Tentar novamente" */}
          <NetworkErrorBanner />
        </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
