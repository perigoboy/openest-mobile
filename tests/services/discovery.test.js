// tests/services/discovery.test.js
// T030 — serviço do Discovery Engine: query string enviada em GET
// /api/users/buscar e normalização da resposta para o shape do card.
import api from '../../src/services/api';
import {
  DISCOVERY_PAGE_SIZE,
  avatarFallback,
  buildSearchParams,
  excludeSeenProfiles,
  fetchCompatibleProfiles,
  normalizeProfile,
  undoInteraction,
} from '../../src/services/discovery';

jest.mock('../../src/services/api', () => ({
  get: jest.fn(),
  delete: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('discovery — buildSearchParams (T030)', () => {
  it('sempre envia paginação padrão', () => {
    expect(buildSearchParams()).toEqual({ page: 1, limit: DISCOVERY_PAGE_SIZE });
  });

  it('mapeia preferências do mobile para os parâmetros do backend', () => {
    expect(buildSearchParams({ minAge: 21, maxAge: 30, gender: 'couples' })).toEqual({
      page: 1,
      limit: DISCOVERY_PAGE_SIZE,
      idade_min: 21,
      idade_max: 30,
      status: 'casal',
    });
    expect(buildSearchParams({ minAge: 18, maxAge: 40, gender: 'groups' }).status).toBe('grupo');
    // Gêneros sem equivalente no backend não geram parâmetro extra.
    expect(buildSearchParams({ minAge: 18, maxAge: 40, gender: 'women' })).not.toHaveProperty('status');
  });
});

describe('discovery — normalizeProfile (T030)', () => {
  it('converte o usuário da API para o shape do DiscoveryCard', () => {
    const profile = normalizeProfile({
      id: 42,
      name: 'Ana',
      idade: 27,
      status_relacionamento: 'casal',
      photos: ['https://res.cloudinary.com/openest/image/upload/a.jpg', 'https://res.cloudinary.com/openest/image/upload/b.jpg'],
      foto_url: 'https://res.cloudinary.com/openest/image/upload/legacy.jpg',
      bio: 'Oi!',
    });
    expect(profile).toMatchObject({
      id: 42,
      name: 'Ana',
      age: 27,
      kind: 'couple',
      kindLabel: 'Casal',
      // Posição 0 da galeria é a foto principal (T021).
      photo: 'https://res.cloudinary.com/openest/image/upload/a.jpg',
      bio: 'Oi!',
    });
  });

  it('cai para foto_url e depois para avatar de fallback', () => {
    expect(normalizeProfile({ name: 'Bia', foto_url: 'https://x/f.jpg' }).photo).toBe('https://x/f.jpg');
    expect(normalizeProfile({ name: 'Bia' }).photo).toBe(avatarFallback('Bia'));
    expect(avatarFallback()).toContain('ui-avatars.com');
  });

  it('ignora entradas não-URL da galeria e trata grupo', () => {
    const profile = normalizeProfile({ name: 'Time', idade: 30, status_relacionamento: 'grupo', photos: [null, 123] });
    expect(profile.photo).toBe(avatarFallback('Time'));
    expect(profile.kind).toBe('group');
    expect(profile.kindLabel).toBe('Grupo');
  });
});

describe('discovery — excludeSeenProfiles (T033)', () => {
  const profiles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('remove os perfis cujos IDs já foram avaliados na sessão', () => {
    expect(excludeSeenProfiles(profiles, new Set(['b'])).map((p) => p.id)).toEqual(['a', 'c']);
    expect(excludeSeenProfiles(profiles, new Set(['a', 'c'])).map((p) => p.id)).toEqual(['b']);
  });

  it('devolve a lista intacta com cache vazio/inexistente e trata lista nula', () => {
    expect(excludeSeenProfiles(profiles, new Set())).toEqual(profiles);
    expect(excludeSeenProfiles(profiles, null)).toEqual(profiles);
    expect(excludeSeenProfiles(null, new Set(['a']))).toEqual([]);
  });
});

describe('discovery — fetchCompatibleProfiles (T030)', () => {
  it('dispara GET /api/users/buscar com a query das preferências', async () => {
    api.get.mockResolvedValueOnce({ data: { perfis: [], hasMore: false, total_resultados: 0 } });
    await fetchCompatibleProfiles({ minAge: 22, maxAge: 28, gender: 'all' });
    expect(api.get).toHaveBeenCalledWith('/api/users/buscar', {
      params: { page: 1, limit: DISCOVERY_PAGE_SIZE, idade_min: 22, idade_max: 28 },
    });
  });

  it('devolve os perfis normalizados com.hasMore e total', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        perfis: [{ id: 1, name: 'Rita', idade: 24, status_relacionamento: 'solteiro', foto_url: 'https://x/r.jpg' }],
        hasMore: true,
        total_resultados: 17,
      },
    });
    const result = await fetchCompatibleProfiles({});
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(17);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toMatchObject({ name: 'Rita', age: 24, kind: 'single', kindLabel: null, photo: 'https://x/r.jpg' });
  });
});

describe('discovery — undoInteraction (T034)', () => {
  it('dispara DELETE /api/desfazer/:usuarioId e devolve a resposta', async () => {
    api.delete.mockResolvedValueOnce({ data: { message: 'Interação desfeita!', tipo: 'like', match_removido: false } });
    const data = await undoInteraction('uuid-42');
    expect(api.delete).toHaveBeenCalledWith('/api/desfazer/uuid-42');
    expect(data).toEqual({ message: 'Interação desfeita!', tipo: 'like', match_removido: false });
  });

  it('propaga o erro quando a reversão falha (para o caller tratar)', async () => {
    api.delete.mockRejectedValueOnce(new Error('offline'));
    await expect(undoInteraction('uuid-42')).rejects.toThrow('offline');
  });
});