// src/services/block.js
// Bloquear/esconder um perfil. O backend não tem rota de bloqueio dedicada,
// então usamos a interação de "passar" (POST /api/passar/:usuarioId), que
// registra o descarte: o perfil deixa de aparecer na Descoberta (buscarPerfis
// exclui quem já teve interação). O front ainda remove o perfil das listas
// locais na hora. (A rota antiga /api/bloquear não existe → dava 404.)
import api from "./api";

export async function blockUser(blockedId) {
  if (blockedId == null) {
    throw new Error("Não foi possível identificar o usuário a ser bloqueado.");
  }

  const { data } = await api.post(`/api/passar/${encodeURIComponent(blockedId)}`);
  return data;
}
