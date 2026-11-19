// src/services/events.js
// Agendamento de encontros — mesmas rotas/contrato do openest-web.
import api from "./api";

// POST /api/events/agendar — cria o encontro agendado (scheduled_events).
// payload: { conversation_id, other_user_id, titulo, scheduled_at, local, nota }
export async function createEvent(payload) {
  const { data } = await api.post("/api/events/agendar", payload);
  return data;
}

// POST /api/mensagens/:id/responder — marca o convite como aceite/recusado;
// o backend troca o conteúdo da mensagem e emite `invite_updated` na sala.
export async function respondInvite(messageId, resposta) {
  const { data } = await api.post(`/api/mensagens/${encodeURIComponent(messageId)}/responder`, { resposta });
  return data;
}

// DELETE /api/events/cancelar/:id — cancela um encontro agendado.
export async function cancelEvent(eventId) {
  const { data } = await api.delete(`/api/events/cancelar/${encodeURIComponent(eventId)}`);
  return data;
}
