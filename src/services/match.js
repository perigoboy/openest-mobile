// src/services/match.js
// T041 — Desfazer match (unmatch): encerra uma conexão diretamente pela
// lista de conversas, sem depender de denúncia/bloqueio.
// Dispara DELETE /api/match/:id e o front remove a conversa da lista.
import api from "./api";
import { resolveMediaUrl } from "../utils/mediaUrl";

// Front-3 — a rota real é GET /api/events/meus-encontros (a antiga
// /api/matches não existe → 404). Devolve matches + encontros agendados,
// no formato: { id, titulo, matchName, matchId (conversa), fotos:[url], local, tipo }.
// Normalizamos para o que a tela de Encontros consome.
export function normalizeEncontro(ev = {}) {
  const foto = Array.isArray(ev.fotos) ? ev.fotos.find(Boolean) : null;
  return {
    id: ev.id, // 'match-<uuid>' | 'sched-<n>'
    rawId: String(ev.id ?? "").replace(/^(match|sched)-/, ""),
    tipo: ev.tipo || "match",
    name: ev.matchName || ev.titulo || "Encontro",
    photo: resolveMediaUrl(foto) || null, // Cloudinary; Avatar faz fallback de iniciais
    subtitle: ev.local || "A combinar via chat",
    conversationId: ev.matchId ?? null,
  };
}

export async function fetchMatches() {
  const { data } = await api.get("/api/events/meus-encontros");
  if (!Array.isArray(data)) return [];
  return data.map(normalizeEncontro);
}

// Front-3 — "Desistir": só encontros AGENDADOS têm rota de cancelamento
// (DELETE /api/events/cancelar/:id). Para um match não há rota de desfazer no
// backend hoje; devolvemos { skipped:true } para a tela remover só localmente.
export async function cancelEncontro(item) {
  if (item?.tipo === "agendado" && item.rawId) {
    const { data } = await api.delete(`/api/events/cancelar/${item.rawId}`);
    return data;
  }
  return { skipped: true };
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
