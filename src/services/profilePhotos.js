import api from './api';

/**
 * T021 — regras da galeria de múltiplas fotos de perfil.
 *
 * A lista é ordenada: a posição 0 é a foto principal, exibida no Avatar e no
 * Card de Descoberta (o backend espelha photos[0] em foto_url). O limite N é
 * compartilhado com o backend (userController.MAX_PROFILE_PHOTOS = 6).
 */
export const MAX_PROFILE_PHOTOS = 6;

/**
 * Normaliza a lista: só strings não vazias, sem duplicadas, na ordem enviada
 * e respeitando o limite N.
 *
 * @param {unknown} list lista bruta (ex.: vinda da API)
 * @returns {string[]} lista limpa
 */
export function sanitizePhotos(list) {
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const sanitized = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sanitized.push(url);
    if (sanitized.length >= MAX_PROFILE_PHOTOS) break;
  }
  return sanitized;
}

/**
 * Resolve a galeria a partir da resposta de GET /api/users/perfil:
 * usa `photos` (T021) e faz fallback para `foto_url` (perfis antigos).
 *
 * @param {{ photos?: string[], foto_url?: string }} data corpo do perfil
 * @returns {string[]} lista ordenada
 */
export function photosFromProfile(data) {
  const photos = sanitizePhotos(data && data.photos);
  if (photos.length > 0) return photos;
  return sanitizePhotos([data && data.foto_url]);
}

/**
 * Adiciona uma foto no fim da lista (não vira principal).
 */
export function addPhoto(list, url) {
  return sanitizePhotos([...sanitizePhotos(list), url]);
}

/**
 * Remove a foto da posição informada.
 */
export function removePhoto(list, index) {
  return sanitizePhotos(sanitizePhotos(list).filter((_, i) => i !== index));
}

/**
 * Move a foto de `from` para `to` (reordenação manual).
 * Retorna a mesma lista quando os índices são inválidos.
 */
export function movePhoto(list, from, to) {
  const photos = sanitizePhotos(list);
  if (
    from === to ||
    from < 0 || from >= photos.length ||
    to < 0 || to >= photos.length
  ) {
    return photos;
  }
  const reordered = [...photos];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  return reordered;
}

/**
 * Define a foto da posição `index` como principal (move para a posição 0).
 */
export function setMainPhoto(list, index) {
  return movePhoto(list, index, 0);
}

/**
 * Foto principal (posição 0) — a mesma exibida no Card de Descoberta.
 */
export function getMainPhoto(list) {
  return sanitizePhotos(list)[0] || null;
}

/**
 * Persiste a ordem da galeria no backend (T021).
 *
 * PUT /api/users/perfil aceita `photos` (lista ordenada) e mantém
 * foto_url === photos[0]. O `foto_url` acompanha a chamada para que
 * clientes/backends antigos ainda atualizem a foto principal.
 *
 * @param {string[]} list lista completa na ordem desejada
 * @returns {Promise<string[]>} lista sanitizada que foi enviada
 */
export async function persistProfilePhotos(list) {
  const photos = sanitizePhotos(list);
  await api.put('/api/users/perfil', {
    photos,
    foto_url: photos[0] || null,
  });
  return photos;
}
