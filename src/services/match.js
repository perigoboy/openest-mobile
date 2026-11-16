// src/services/match.js
// T041 — Desfazer match (unmatch): encerra uma conexão diretamente pela
// lista de conversas, sem depender de denúncia/bloqueio.
// Dispara DELETE /api/match/:id e o front remove a conversa da lista.
import api from "./api";

// T047 — Buscar encontros/matches disponíveis via GET
// Rota esperada: GET /api/matches (ou /api/encontros)
export async function fetchMatches() {
  const { data } = await api.get("/api/matches");
  return data;
}

// T041 — Desfazer match (unmatch): encerra uma conexão diretamente pela
// lista de conversas, sem depender de denúncia/bloqueio.
// Dispara DELETE /api/match/:id e o front remove a conversa da lista.
export async function unmatch(matchId) {
  if (matchId == null) {
    throw new Error("Não foi possível identificar o match a ser removido.");
  }

  const { data } = await api.delete(`/api/match/${matchId}`);
  return data;
}
