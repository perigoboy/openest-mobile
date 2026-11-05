import api from "./api";

export const REPORT_REASONS = [
  "Bullying ou perfil inadequado",
  "Suicídio, automutilação ou distúrbios alimentares",
  "Violência, ódio ou exploração",
  "Venda ou promoção de itens proibidos",
  "Nudez ou atividade sexual",
  "Golpe, fraude ou spam",
  "Informação falsa",
];

export async function submitReport(reportedId, reason, description = "") {
  if (reportedId == null) {
    throw new Error("Não foi possível identificar o perfil denunciado.");
  }
  if (!reason) {
    throw new Error("Selecione um motivo para a denúncia.");
  }

  const { data } = await api.post("/api/denunciar", {
    reported_id: reportedId,
    reason,
    description,
  });
  return data;
}
