// tests/services/userLocation.test.js
// T028 — geolocalização: sanitização, persistência local + sync, Haversine.
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import api from '../../src/services/api';
import {
  distanceKm,
  loadLocation,
  requestLocation,
  sanitizeLocation,
  saveLocation,
} from '../../src/services/userLocation';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../../src/services/api', () => ({
  patch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('userLocation — sanitize', () => {
  it('rejeita coordenadas inválidas', () => {
    expect(sanitizeLocation({ latitude: 200, longitude: 0 })).toBeNull();
    expect(sanitizeLocation({ latitude: 'x', longitude: 0 })).toBeNull();
  });

  it('normaliza uma posição válida', () => {
    const clean = sanitizeLocation({ latitude: -3.7, longitude: -38.5 });
    expect(clean.latitude).toBe(-3.7);
    expect(clean.updatedAt).toBeTruthy();
  });
});

describe('userLocation — load/save', () => {
  it('retorna null sem nada salvo e salva local sem backend', async () => {
    await expect(loadLocation()).resolves.toBeNull();
    const clean = await saveLocation({ latitude: -3.7, longitude: -38.5 });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_location', JSON.stringify(clean));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('envia PATCH ao backend quando há URL', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
    api.patch.mockResolvedValueOnce({ data: {} });
    await saveLocation({ latitude: -3.7, longitude: -38.5 });
    expect(api.patch).toHaveBeenCalledWith('/api/users/perfil', { latitude: -3.7, longitude: -38.5 });
  });
});

describe('userLocation — request + distância', () => {
  it('retorna denied sem chamar o GPS quando o usuário nega', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(requestLocation()).resolves.toEqual({ status: 'denied', location: null });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('captura e salva quando há permissão', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValueOnce({ coords: { latitude: -3.7, longitude: -38.5 } });
    const result = await requestLocation();
    expect(result.status).toBe('granted');
    expect(result.location.latitude).toBe(-3.7);
  });

  it('Haversine: Fortaleza centro → Meireles ≈ 2-4 km', () => {
    const km = distanceKm(
      { latitude: -3.7277, longitude: -38.5267 },
      { latitude: -3.7172, longitude: -38.5005 }
    );
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(6);
  });
});
