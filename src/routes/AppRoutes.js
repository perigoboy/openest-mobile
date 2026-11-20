// Navegação privada com barra inferior fixa (estilo WhatsApp): ícone +
// rótulo, indicador da aba ativa e borda sutil no topo. Por ser parte do
// layout (não flutua por cima), nenhuma tela precisa de paddingBottom extra
// para a barra não cobrir o conteúdo. Acompanha o tema claro/escuro.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { selectionTick } from "../utils/haptics";

import Discovery from "../screens/Discovery";
import SearchPreferences from "../screens/SearchPreferences";
import Matches from "../screens/Matches";
import Chat from "../screens/Chat";
import Encontros from "../screens/Encontros";
import Profile from "../screens/Profile";
import Settings from "../screens/Settings"; // T025: tela real da configuração
import PhotoVerification from "../screens/PhotoVerification"; // T023: fluxo de selfie

const Tab = createBottomTabNavigator();

// [ícone ativo, ícone inativo]
const ICONS = {
  Discovery: ["flame", "flame-outline"],
  Matches: ["chatbubbles", "chatbubbles-outline"],
  Encontros: ["calendar", "calendar-outline"],
  Profile: ["person-circle", "person-circle-outline"],
  Settings: ["settings", "settings-outline"],
};

// T052 — nome lido pelo leitor de tela (antes era o nome interno da rota,
// em inglês: "Discovery", "Settings"...).
export const TAB_LABELS = {
  Discovery: "Descobrir",
  Matches: "Conversas",
  Encontros: "Encontros",
  Profile: "Perfil",
  Settings: "Configurações",
};

// Rótulo VISÍVEL (curto para caber em telas de 320px). O leitor de tela
// continua lendo o nome completo de TAB_LABELS.
const SHORT_LABELS = { ...TAB_LABELS, Settings: "Ajustes" };

// Só estas aparecem na barra — Chat, SearchPreferences e PhotoVerification
// continuam registrados (deep-link/navegação interna), mas sem botão.
const VISIBLE_TABS = ["Discovery", "Matches", "Encontros", "Profile", "Settings"];
const FULLSCREEN_ROUTES = ["Chat", "SearchPreferences", "PhotoVerification"];

export function GlassTabBar({ state, navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  if (FULLSCREEN_ROUTES.includes(activeName)) return null;

  const tabs = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((route) => {
        const focused = route.name === activeName;
        const [iconOn, iconOff] = ICONS[route.name];
        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="tab"
            accessibilityLabel={TAB_LABELS[route.name] || route.name}
            accessibilityState={{ selected: focused }}
            style={styles.tab}
            onPress={() => {
              if (!focused) selectionTick();
              navigation.navigate(route.name);
            }}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]}>
              <Ionicons
                name={focused ? iconOn : iconOff}
                size={22}
                color={focused ? colors.tabActive : colors.tabInactive}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {SHORT_LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Nome mais claro para o novo visual (o antigo continua exportado).
export const TabBar = GlassTabBar;

export default function AppRoutes() {
  return (
    <Tab.Navigator
      initialRouteName="Discovery"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Discovery" component={Discovery} options={{ title: "Descobrir" }} />
      <Tab.Screen
        name="SearchPreferences"
        component={SearchPreferences}
        options={{ tabBarButton: () => null, tabBarStyle: { display: "none" } }}
      />
      <Tab.Screen name="Matches" component={Matches} options={{ title: "Conversas" }} />
      {/*
        "Chat" fica fora da tab bar visível (aberto a partir de um item da
        lista de Matches), mas já registramos aqui para o T044 (Deep Linking)
        conseguir navegar direto até ele a partir de uma notificação push.
      */}
      <Tab.Screen
        name="Chat"
        component={Chat}
        options={{ tabBarButton: () => null, tabBarStyle: { display: "none" } }}
      />
      <Tab.Screen name="Encontros" component={Encontros} options={{ title: "Encontros" }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: "Perfil" }} />
      <Tab.Screen name="Settings" component={Settings} options={{ title: "Configurações" }} />
      {/*
        T023 — Verificação de selfie: mesma tática do Chat (rota fora da tab
        bar visível) para abrir a tela cheia de verificação a partir do item
        "Verificação de foto" das Configurações.
      */}
      <Tab.Screen
        name="PhotoVerification"
        component={PhotoVerification}
        options={{ tabBarButton: () => null, tabBarStyle: { display: "none" } }}
      />
    </Tab.Navigator>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      paddingTop: 6,
      paddingHorizontal: 4,
      backgroundColor: colors.tabBar,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      rowGap: 2,
    },
    // Indicador da aba ativa atrás do ícone (padrão atual do WhatsApp/Material).
    indicator: {
      width: 56,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    indicatorActive: {
      backgroundColor: colors.primarySoft,
    },
    label: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.tabInactive,
    },
    labelActive: {
      color: colors.tabActive,
      fontWeight: "700",
    },
  });
