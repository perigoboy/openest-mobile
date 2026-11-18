// src/services/giphy.js
// Seletor de GIFs. O web tem só um placeholder ("em breve"), então não há chave
// de GIFs configurada no projeto. Usamos a API pública do Giphy: a chave vem de
// EXPO_PUBLIC_GIPHY_KEY e, se não houver, caímos na chave pública de
// desenvolvimento do próprio Giphy (apenas para testes/demonstração).
//
// O GIF escolhido é enviado como uma MENSAGEM normal cujo conteúdo é a URL do
// .gif — renderiza como imagem no mobile e no web (em tempo real via socket).
const GIPHY_DEV_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"; // chave pública de demo do Giphy
const BASE = "https://api.giphy.com/v1/gifs";

export function getGiphyKey() {
  return process.env.EXPO_PUBLIC_GIPHY_KEY || GIPHY_DEV_KEY;
}

// Normaliza a resposta do Giphy para { id, preview, url }.
export function normalizeGiphy(data) {
  const list = Array.isArray(data?.data) ? data.data : [];
  return list
    .map((g) => {
      const url = g?.images?.original?.url || g?.images?.downsized?.url || null;
      const preview = g?.images?.fixed_width?.url || g?.images?.preview_gif?.url || url;
      return url ? { id: g.id, url, preview } : null;
    })
    .filter(Boolean);
}

async function request(path, params) {
  const query = new URLSearchParams({ api_key: getGiphyKey(), ...params }).toString();
  const res = await fetch(`${BASE}/${path}?${query}`);
  if (!res.ok) throw new Error(`Giphy respondeu ${res.status}`);
  return normalizeGiphy(await res.json());
}

export function fetchTrendingGifs({ limit = 24 } = {}) {
  return request("trending", { limit: String(limit), rating: "pg-13" });
}

export function searchGifs(term, { limit = 24 } = {}) {
  const q = String(term || "").trim();
  if (!q) return fetchTrendingGifs({ limit });
  return request("search", { q, limit: String(limit), rating: "pg-13", lang: "pt" });
}
