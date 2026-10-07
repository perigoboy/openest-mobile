// src/routes/index.js
// T005 — Ponto único de decisão: usuário logado vê AppRoutes,
// usuário deslogado vê AuthRoutes.
//
// T025 — o estado vem do AuthContext real (T009), então o login
// (signIn/signUp) e o logout (signOut, acionado pela tela de
// Configurações) trocam de área sozinhos, sem navegação manual.

import React from "react";
import AuthRoutes from "./AuthRoutes";
import AppRoutes from "./AppRoutes";
import { useAuth } from "../contexts/AuthContext";
import { Loader } from "../components";

export default function Routes() {
  const { signed, loading } = useAuth();

  // Enquanto lê o token salvo no SecureStore, evita piscar a tela de login.
  if (loading) {
    return <Loader fullScreen />;
  }

  return signed ? <AppRoutes /> : <AuthRoutes />;
}
