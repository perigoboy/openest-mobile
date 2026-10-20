// src/services/discovery.js
// T030 — Discovery Engine: consumo real da busca de perfis compatíveis.
// A rota GET /api/users/buscar (ver openest-api/src/controllers/userController.js)
// já aplica os filtros do backend (idade, status, interesses), exclui perfis
// com interação anterior e o modo discreto; o front apenas envia as preferências
// e normaliza a resposta para o shape do DiscoveryCard.
import api from "./api";

// Mesmo tamanho de página usado pelo web (openest-web Discovery.jsx).
export const DISCOVERY_PAGE_SIZE = 10;

// Avatar gerado quando o perfil não tem nenhuma foto utilizável — espelha o
// avatarFallback do web para manter consistência entre plataformas.
export function avatarFallback(name = "Openest") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`;
}

// Converte um usuário da API para o shape do DiscoveryCard (T029):
// { id, name, age, neighborhood, city, distance, kind, kindLabel, photo, bio }.
// A API de buscar devolve `idade` (calculada do birth_date) e a galeria em
// `photos` (URLs do Cloudinary, posição 0 = principal — T021), com `foto_url`
// como legado/plan B.
export function normalizeProfile(user) {
  const photos = Array.isArray(user?.photos)
    ? user.photos.filter((p) => typeof p === "string" && p.startsWith("http"))
    : [];
  const photo =
    photos[0] ||
    (typeof user?.foto_url === "string" && user.foto_url.startsWith("http") ? user.foto_url : null) ||
    avatarFallback(user?.name);

  const kind =
    user?.status_relacionamento === "casal"
      ? "couple"
      : user?.status_relacionamento === "grupo"
        ? "group"
        : "single";

  return {
    id: user?.id,
    name: user?.name || "Desconhecido",
    age: user?.idade ?? "?",
    neighborhood: user?.bairro || null,
    city: user?.cidade || null,
    distance: Number.isFinite(user?.distancia) ? `${Math.round(user.distancia)} km` : null,
    kind,
    kindLabel: kind === "couple" ? "Casal" : kind === "group" ? "Grupo" : null,
    photo,
    bio: user?.bio || "",
  };
}

// T033 — cache local de perfis já vistos: remove do baralho os IDs já
// avaliados na sessão (like/pass por swipe ou botões) para que não repitam
// em buscas e recarregamentos. Complementa o filtro do backend, que só
// exclui interações já registradas no servidor.
export function excludeSeenProfiles(profiles, seenIds) {
  if (!seenIds || seenIds.size === 0) return profiles || [];
  return (profiles || []).filter((profile) => !seenIds.has(profile.id));
}

// Monta a query string aceita por /api/users/buscar a partir das preferências
// do mobile (T027). `gender` do mobile vira `status` (status_relacionamento)
// para casais/grupos; singles/mulheres/homens não têm campo equivalente no
// backend e ficam por conta da própria API.
export function buildSearchParams(prefs = {}) {
  const params = { page: 1, limit: DISCOVERY_PAGE_SIZE };
  if (Number.isFinite(prefs.minAge)) params.idade_min = prefs.minAge;
  if (Number.isFinite(prefs.maxAge)) params.idade_max = prefs.maxAge;
  if (prefs.gender === "couples") params.status = "casal";
  if (prefs.gender === "groups") params.status = "grupo";
  return params;
}

// Dispara o GET da rota de perfis compatíveis e devolve o baralho normalizado.
export async function fetchCompatibleProfiles(prefs) {
  const { data } = await api.get("/api/users/buscar", { params: buildSearchParams(prefs) });
  const raw = data?.perfis || data?.users || data?.results || data?.data || [];
  return {
    profiles: raw.map(normalizeProfile),
    hasMore: Boolean(data?.hasMore),
    total: data?.total_resultados ?? raw.length,
  };
}

// T034 — desfazer (undo) da última interação com um perfil.
// DELETE /api/desfazer/:usuarioId (openest-api interactionRoutes): remove o
// último like/pass registrado pelo usuário no servidor e o match/conversa
// vazia originado por esse like.
export async function undoInteraction(targetUserId) {
  const { data } = await api.delete(`/api/desfazer/${targetUserId}`);
  return data;
}
