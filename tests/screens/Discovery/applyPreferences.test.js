// tests/screens/Discovery/applyPreferences.test.js
//
// T035 — Testes automatizados do Discovery Engine.
// Foco: função pura `applyPreferences` (filtragem de perfis).
//
// Nota: as features de cache (T033) e undo (T034) não foram
// implementadas no código atual, portanto não há testes para elas.

import { applyPreferences } from "../../../src/screens/Discovery";
import { DEFAULT_PREFERENCES } from "../../../src/services/searchPreferences";
import { MOCK_PROFILES } from "../../../src/screens/Discovery/mockProfiles";

describe("Discovery — applyPreferences (Filtros de Busca)", () => {
  // Um usuário fictício logado (posição base para cálculo de distância)
  const userLocation = { latitude: -3.7319, longitude: -38.5267 }; // Fortaleza

  // Helper pra montar preferências, substituindo o DEFAULT
  const makePrefs = (overrides = {}) => ({ ...DEFAULT_PREFERENCES, ...overrides });

  it("retorna todos os perfis quando o filtro é totalmente permissivo", () => {
    const prefs = makePrefs({ minAge: 18, maxAge: 99, maxDistanceKm: 500, gender: "all" });
    const filtered = applyPreferences(MOCK_PROFILES, prefs, userLocation);
    
    // Como todos os mocks estão perto e na faixa, devem passar todos
    expect(filtered).toHaveLength(MOCK_PROFILES.length);
  });

  it("filtra por faixa etária (minAge e maxAge)", () => {
    // Apenas perfis entre 25 e 26 anos
    const prefs = makePrefs({ minAge: 25, maxAge: 26 });
    const filtered = applyPreferences(MOCK_PROFILES, prefs, userLocation);
    
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((p) => {
      expect(p.age).toBeGreaterThanOrEqual(25);
      expect(p.age).toBeLessThanOrEqual(26);
    });
  });

  it("filtra por gênero (single, couples, groups)", () => {
    const prefsCouple = makePrefs({ gender: "couples" });
    const filteredCouple = applyPreferences(MOCK_PROFILES, prefsCouple, userLocation);
    expect(filteredCouple.every((p) => p.kind === "couple")).toBe(true);

    const prefsGroup = makePrefs({ gender: "groups" });
    const filteredGroup = applyPreferences(MOCK_PROFILES, prefsGroup, userLocation);
    expect(filteredGroup.every((p) => p.kind === "group")).toBe(true);

    const prefsSingle = makePrefs({ gender: "women" }); // Assume single para o mock
    const filteredSingle = applyPreferences(MOCK_PROFILES, prefsSingle, userLocation);
    expect(filteredSingle.every((p) => p.kind === "single")).toBe(true);
  });

  it("filtra por distância usando o fallback de string (quando não há coordenadas)", () => {
    // No mockProfiles, temos "0,5 quilômetros" e "15 quilômetros"
    // Vamos filtrar só até 5km. O perfil de 15km deve sair.
    const prefs = makePrefs({ maxDistanceKm: 5 });
    const filtered = applyPreferences(MOCK_PROFILES, prefs, null); // null = força fallback string
    
    const names = filtered.map((p) => p.name);
    expect(names).toContain("Juliana Ferraz"); // 0,5 km
    expect(names).toContain("Julia Maria"); // 2 km
    expect(names).not.toContain("Sofia Espanha"); // 15 km
  });

  it("filtra por distância usando Haversine (quando há coordenadas reais)", () => {
    // Se o perfil tiver latitude/longitude, a função deve usar distanceKm
    const profilesComCoords = [
      { ...MOCK_PROFILES[0], latitude: -3.7319, longitude: -38.5267, distance: null }, // Mesma localidade (0km)
      { ...MOCK_PROFILES[1], latitude: -3.8000, longitude: -38.6000, distance: null }, // Um pouco longe
    ];
    
    const prefs = makePrefs({ maxDistanceKm: 10 });
    const filtered = applyPreferences(profilesComCoords, prefs, userLocation);

    expect(filtered).toHaveLength(1); // Só o que tá 0km deve passar
    expect(filtered[0].name).toBe("Julio e Talita");
  });

  it("retorna lista vazia se nenhum perfil bater com os filtros", () => {
    // Faixa etária impossível (ex: > 100 anos)
    const prefs = makePrefs({ minAge: 100, maxAge: 120 });
    const filtered = applyPreferences(MOCK_PROFILES, prefs, userLocation);
    expect(filtered).toHaveLength(0);
  });
});