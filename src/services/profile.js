// src/services/profile.js
// Perfil do usuário logado — mesmas rotas/contrato do openest-web.
import api from "./api";

// GET /api/users/perfil → dados do usuário (name, bio, status_relacionamento,
// birth_date, foto_url, photos, modo_discreto, verificado, email).
export async function fetchMyProfile() {
  const { data } = await api.get("/api/users/perfil");
  return data || {};
}

// PUT /api/users/perfil — mesmos campos que o web salva. O backend ignora
// campos não suportados (ver userController.atualizarPerfil).
export async function updateMyProfile(payload) {
  const { data } = await api.put("/api/users/perfil", payload);
  return data;
}
