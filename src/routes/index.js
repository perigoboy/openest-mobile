// src/routes/index.js
// T005 — Ponto único de decisão: usuário logado vê AppRoutes,
// usuário deslogado vê AuthRoutes.
//
// T025 — o estado vem do AuthContext real (T009), então o login
// (signIn/signUp) e o logout (signOut, acionado pela tela de
// Configurações) trocam de área sozinhos, sem navegação manual.
//
// T051 — a SplashScreen nativa fica na tela até o AuthContext terminar de
// ler o token salvo; só então é escondida, já com a área certa renderizada
// (sem "piscar" a tela de login para quem já está logado).

import React, { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import AuthRoutes from "./AuthRoutes";
import AppRoutes from "./AppRoutes";
import { useAuth } from "../contexts/AuthContext";
import { Loader } from "../components";

export default function Routes() {
  const { signed, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {
        // Já escondida (ex.: Fast Refresh) — nada a fazer.
      });
    }
  }, [loading]);

  // Enquanto lê o token salvo no SecureStore, evita piscar a tela de login.
  if (loading) {
    return <Loader fullScreen />;
  }

  return signed ? <AppRoutes /> : <AuthRoutes />;
}
