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
// Data/hora formatada (pt-BR) ou null.
export function formatEncontroDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Link do Google Agenda para um encontro agendado (abre o formulário pré-preenchido).
export function googleCalendarUrl({ titulo, scheduledAt, local, nota }) {
  if (!scheduledAt) return null;
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1h
  const fmt = (d) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}00Z`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo || "Encontro",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: nota || "",
    location: local || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function normalizeEncontro(ev = {}) {
  const foto = Array.isArray(ev.fotos) ? ev.fotos.find(Boolean) : null;
  const tipo = ev.tipo || "match";
  const agendado = tipo === "agendado";
  const dateTime = agendado ? formatEncontroDate(ev.data_encontro) : null;
  return {
    id: ev.id, // 'match-<uuid>' | 'sched-<n>'
    rawId: String(ev.id ?? "").replace(/^(match|sched)-/, ""),
    tipo,
    name: ev.matchName || ev.titulo || "Encontro",
    titulo: ev.titulo || null,
    photo: resolveMediaUrl(foto) || null, // Cloudinary; Avatar faz fallback de iniciais
    local: ev.local || (agendado ? null : "A combinar via chat"),
    dateTime,
    status: agendado ? "Agendado" : "A combinar",
    subtitle: ev.local || (agendado ? dateTime || "Encontro agendado" : "A combinar via chat"),
    conversationId: ev.matchId ?? null,
    googleUrl: agendado
      ? googleCalendarUrl({ titulo: ev.titulo, scheduledAt: ev.data_encontro, local: ev.local, nota: ev.nota })
      : null,
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
