// Navegação privada com bottom tab flutuante em vidro (liquid glass).
// Mantém todas as rotas: Discovery, Matches, Chat (oculto), Profile,
// Settings e PhotoVerification (oculta). Só muda o visual da tab bar.
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Discovery from "../screens/Discovery";
import Matches from "../screens/Matches";
import Chat from "../screens/Chat";
import Profile from "../screens/Profile";
import Settings from "../screens/Settings"; // T025: tela real da configuração
import PhotoVerification from "../screens/PhotoVerification"; // T023: fluxo de selfie

const Tab = createBottomTabNavigator();

const ICONS = {
  Discovery: "flame",
  Matches: "chatbubbles",
  Chat: "chatbox-ellipses",
  Profile: "person-circle",
  Settings: "settings",
};

// Só estes 4 aparecem na barra — Chat e PhotoVerification continuam
// registrados (deep-link), mas sem botão.
const VISIBLE_TABS = ["Discovery", "Matches", "Profile", "Settings"];
const FULLSCREEN_ROUTES = ["Chat", "PhotoVerification"];

function GlassTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  if (FULLSCREEN_ROUTES.includes(activeName)) return null;

  const tabs = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  return (
    <View style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <BlurView intensity={65} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.barRow}>
          {tabs.map((route) => {
            const focused = route.name === activeName;
            const icon = ICONS[route.name];
            return (
              <View key={route.key} style={styles.tabSlot}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={route.name}
                  accessibilityState={{ selected: focused }}
                  style={[styles.iconWrap, focused && styles.iconActive]}
                  onPress={() => navigation.navigate(route.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon} color="#6D1BC7" size={24} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function AppRoutes() {
  return (
    <Tab.Navigator
      initialRouteName="Discovery"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Discovery" component={Discovery} options={{ title: "Descobrir" }} />
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

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    height: 68,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: "rgba(244,236,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#2A0A55",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 10,
  },
  barRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(109,27,199,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
