// src/routes/AuthRoutes.js
// T005 — Pilha (Stack) de navegação PÚBLICA: telas que existem antes do login.
// Usa @react-navigation/native-stack (mais leve e com transições nativas).

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../styles/theme";

import Login from "../screens/Login"; // T011: tela real da T010
import Register from "../screens/Register"; // T012: tela real da T010
import ForgotPassword from "../screens/ForgotPassword"; // T013: tela real (antes: ../screens/Auth/ForgotPassword, placeholder)

const Stack = createNativeStackNavigator();

export default function AuthRoutes() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
}
