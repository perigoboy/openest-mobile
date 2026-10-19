// src/services/searchPreferences.js
// T027 — Preferências de Busca (filtros do Discovery).
// FRONT-ONLY por enquanto: persiste local (SecureStore) e realimenta o
// Discovery filtrando o baralho. Quando o backend existir, o mesmo objeto
// é enviado via PATCH /api/users/perfil (ver TODO em savePreferences).
import * as SecureStore from "expo-secure-store";
import api from "./api";

export const PREFERENCES_KEY = "search_preferences";

export const GENDER_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "women", label: "Mulheres" },
  { id: "men", label: "Homens" },
  { id: "couples", label: "Casais" },
  { id: "groups", label: "Grupos" },
];

export const DEFAULT_PREFERENCES = {
  minAge: 18,
  maxAge: 35,
  maxDistanceKm: 25,
  gender: "all",
};

export function sanitizePreferences(raw) {
  const base = { ...DEFAULT_PREFERENCES, ...(raw || {}) };
  let minAge = Number(base.minAge);
  let maxAge = Number(base.maxAge);
  let maxDistanceKm = Number(base.maxDistanceKm);
  if (!Number.isFinite(minAge)) minAge = DEFAULT_PREFERENCES.minAge;
  if (!Number.isFinite(maxAge)) maxAge = DEFAULT_PREFERENCES.maxAge;
  if (!Number.isFinite(maxDistanceKm)) maxDistanceKm = DEFAULT_PREFERENCES.maxDistanceKm;
  minAge = Math.min(99, Math.max(18, Math.round(minAge)));
  maxAge = Math.min(99, Math.max(18, Math.round(maxAge)));
  if (minAge > maxAge) [minAge, maxAge] = [maxAge, minAge];
  maxDistanceKm = Math.min(500, Math.max(1, Math.round(maxDistanceKm)));
  const genderIds = GENDER_OPTIONS.map((o) => o.id);
  const gender = genderIds.includes(base.gender) ? base.gender : "all";
  return { minAge, maxAge, maxDistanceKm, gender };
}

export async function loadPreferences() {
  try {
    const stored = await SecureStore.getItemAsync(PREFERENCES_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    return sanitizePreferences(JSON.parse(stored));
  } catch (error) {
    console.error("Erro ao carregar preferências de busca:", error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(prefs) {
  const clean = sanitizePreferences(prefs);
  // Local primeiro (funciona sem backend / com admin mockado).
  await SecureStore.setItemAsync(PREFERENCES_KEY, JSON.stringify(clean));
  // TODO(T027-backend): quando existir o endpoint, persistir no servidor:
  //   await api.patch("/api/users/perfil", { preferencias_busca: clean });
  // Mantido comentado para não quebrar o front sem backend.
  try {
    if (process.env.EXPO_PUBLIC_API_URL) {
      await api.patch("/api/users/perfil", { preferencias_busca: clean });
    }
  } catch (error) {
    // Falha de rede não derruba o salvamento local (front-first).
    console.error("Preferências salvas localmente; sync c/ backend falhou:", error?.message || error);
  }
  return clean;
}
