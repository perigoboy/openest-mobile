import api from "./api";

export async function likeProfile(profileId) {
  if (profileId === null || profileId === undefined || profileId === "") {
    throw new Error("Não foi possível curtir um perfil sem identificador.");
  }

  const { data } = await api.post(`/api/curtir/${encodeURIComponent(profileId)}`);
  if (typeof data?.match !== "boolean") {
    throw new Error("A resposta da API de curtida não contém o resultado do match.");
  }

  return data.match;
}
