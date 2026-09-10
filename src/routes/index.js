// src/routes/index.js
// T005 — Ponto único de decisão: usuário logado vê AppRoutes,
// usuário deslogado vê AuthRoutes.
//
// ATENÇÃO: o AuthContext real só é criado na T009 (Sprint 2). Por enquanto,
// isso aqui usa um estado local fixo (`isSignedIn = false`) só para o
// roteamento poder ser testado nesta sprint. Quando a T009 estiver pronta,
// troque o bloco abaixo por:
//
//   import { useAuth } from "../contexts/AuthContext";
//   const { isSignedIn } = useAuth();

import React, { useState } from "react";
import AuthRoutes from "./AuthRoutes";
import AppRoutes from "./AppRoutes";

export default function Routes() {
  const [isSignedIn] = useState(false); // TODO(T009): substituir pelo AuthContext

  return isSignedIn ? <AppRoutes /> : <AuthRoutes />;
}
