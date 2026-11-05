import api from "./api";

export async function fetchConversations() {
  const { data } = await api.get("/api/conversas");
  if (!Array.isArray(data)) {
    throw new Error("A resposta da lista de conversas está em um formato inválido.");
  }
  return data;
}
