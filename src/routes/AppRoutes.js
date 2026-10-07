// src/routes/AppRoutes.js
// T005 — Abas (Bottom Tabs) de navegação PRIVADA: telas que só existem
// depois do login. Ícones via @expo/vector-icons (já vem com o Expo).
//
// Observação: este arquivo foi recriado na T025 — o commit 2dbf7ab (T011)
// havia sobrescrito este arquivo por engano com o conteúdo do App.js,
// quebrando o roteamento da área logada.
//
// T025 — registro da tela de Configurações (Settings) no menu de abas.

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/theme";

import Discovery from "../screens/Discovery";
import Matches from "../screens/Matches";
import Chat from "../screens/Chat";
import Profile from "../screens/Profile";
import Settings from "../screens/Settings"; // T025: tela real da configuração

const Tab = createBottomTabNavigator();

const ICONS = {
  Discovery: "flame",
  Matches: "chatbubbles",
  Chat: "chatbox-ellipses",
  Profile: "person-circle",
  Settings: "settings",
};

export default function AppRoutes() {
  return (
    <Tab.Navigator
      initialRouteName="Discovery"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
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
    </Tab.Navigator>
  );
}
