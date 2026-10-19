// tests/services/searchPreferences.test.js
// T027 — serviço de filtros: defaults, sanitização e persistência local.
import * as SecureStore from 'expo-secure-store';
import api from '../../src/services/api';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  sanitizePreferences,
  savePreferences,
} from '../../src/services/searchPreferences';

jest.mock('../../src/services/api', () => ({
  patch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('searchPreferences — sanitize', () => {
  it('troca min/max quando invertidos e limita os extremos', () => {
    expect(sanitizePreferences({ minAge: 40, maxAge: 20, maxDistanceKm: 900, gender: 'x' })).toEqual({
      minAge: 20,
      maxAge: 40,
      maxDistanceKm: 500,
      gender: 'all',
    });
  });
});

describe('searchPreferences — load/save', () => {
  it('retorna o default quando não há nada salvo', async () => {
    await expect(loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it('salva local sem chamar a API quando não há backend', async () => {
    const clean = await savePreferences({ minAge: 20, maxAge: 30, maxDistanceKm: 10, gender: 'groups' });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('search_preferences', JSON.stringify(clean));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('tenta sincronizar com o backend quando há URL configurada', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
    api.patch.mockResolvedValueOnce({ data: {} });
    const clean = await savePreferences({ minAge: 22, maxAge: 28, maxDistanceKm: 5, gender: 'couples' });
    expect(api.patch).toHaveBeenCalledWith('/api/users/perfil', { preferencias_busca: clean });
  });
});
