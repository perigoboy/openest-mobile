// "Desistir": encerra o vínculo inteiro (evento agendado + match) no banco.
//
// Dois bugs faziam o card voltar no refresh:
//   1. mandava `rawId` (sem o prefixo), e a API só reconhecia 'sched-'/'match-'
//      → caía fora dos dois `if`, respondia 200 e não apagava nada;
//   2. cards "A combinar" nem chegavam a chamar a API (saíam só da tela).
// Agora manda o id COMPLETO e sempre chama a API, nos dois tipos de card.
export async function cancelEncontro(item) {
  const id = item?.id;
  if (!id) {
    throw new Error("Não foi possível identificar o encontro a ser removido.");
  }
  const { data } = await api.delete(`/api/events/cancelar/${encodeURIComponent(id)}`, {
    // Rede de segurança: se o evento já tiver sumido, a API ainda resolve o
    // vínculo pelo outro participante.
    data: { other_user_id: item?.otherUserId ?? null },
  });
  return data;
}

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
    otherUserId: ev.otherUserId != null ? String(ev.otherUserId) : null,
    googleUrl: agendado
      ? googleCalendarUrl({ titulo: ev.titulo, scheduledAt: ev.data_encontro, local: ev.local, nota: ev.nota })
      : null,
  };
}

// Deduplica por par de usuários: cada contato aparece UMA vez. Um encontro
// AGENDADO tem prioridade sobre o card "A combinar" (match) do mesmo par.
// (A API já deduplica; isto é uma trava extra no cliente contra duplicidade.)
export function dedupeEncontros(list = []) {
  const porPar = new Map();
  for (const item of list) {
    const chave = item.otherUserId || (item.conversationId != null ? `conv-${item.conversationId}` : item.id);
    const atual = porPar.get(chave);
    // Mantém o agendado sobre o match; se ambos forem do mesmo tipo, fica o 1º.
    if (!atual || (atual.tipo !== "agendado" && item.tipo === "agendado")) {
      porPar.set(chave, item);
    }
  }
  return Array.from(porPar.values());
}

export async function fetchMatches() {
  const { data } = await api.get("/api/events/meus-encontros");
  if (!Array.isArray(data)) return [];
  return dedupeEncontros(data.map(normalizeEncontro));
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
