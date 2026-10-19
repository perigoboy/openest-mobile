// src/services/userLocation.js
// T028 — Capturar e atualizar a geolocalização do usuário.
// FRONT-FIRST: pede permissão (expo-location), captura lat/long, salva local
// (SecureStore) e tenta enviar ao backend (PATCH /api/users/perfil).
// Sem backend / sem permissão, o app segue com fallback (Fortaleza).
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import api from "./api";

export const LOCATION_KEY = "user_location";

// Fallback: Praça do Ferreira, Fortaleza (perto do baralho mockado).
export const FALLBACK_LOCATION = {
  latitude: -3.7277,
  longitude: -38.5267,
  label: "Fortaleza",
  updatedAt: null,
};

export function sanitizeLocation(raw) {
  const latitude = Number(raw?.latitude);
  const longitude = Number(raw?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return {
    latitude,
    longitude,
    label: typeof raw?.label === "string" && raw.label ? raw.label : null,
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  };
}

export async function loadLocation() {
  try {
    const stored = await SecureStore.getItemAsync(LOCATION_KEY);
    if (!stored) return null;
    return sanitizeLocation(JSON.parse(stored));
  } catch (error) {
    console.error("Erro ao carregar localização salva:", error);
    return null;
  }
}

export async function saveLocation(coords) {
  const clean = sanitizeLocation(coords);
  if (!clean) return null;
  await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(clean));
  try {
    if (process.env.EXPO_PUBLIC_API_URL) {
      await api.patch("/api/users/perfil", {
        latitude: clean.latitude,
        longitude: clean.longitude,
      });
    }
  } catch (error) {
    console.error("Localização salva localmente; sync c/ backend falhou:", error?.message || error);
  }
  return clean;
}

export async function requestLocation({ accuracy = Location.Accuracy.Balanced } = {}) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission?.status !== "granted") {
    return { status: "denied", location: null };
  }
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy });
    const clean = await saveLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    return { status: "granted", location: clean };
  } catch (error) {
    console.error("Erro ao capturar localização:", error);
    return { status: "error", location: null };
  }
}

// Haversine: distância real em km entre dois pontos (usada no cálculo de
// distância do Discovery quando o perfil tem coordenadas).
export function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}
