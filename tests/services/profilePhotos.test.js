// tests/services/profilePhotos.test.js
// T021 — regras da galeria de múltiplas fotos: limite N, ordenação,
// foto principal (posição 0) e persistência da ordem no backend.

const mockPut = jest.fn();

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    put: (...args) => mockPut(...args),
  },
}));

import {
  MAX_PROFILE_PHOTOS,
  sanitizePhotos,
  photosFromProfile,
  addPhoto,
  removePhoto,
  movePhoto,
  setMainPhoto,
  getMainPhoto,
  persistProfilePhotos,
} from '../../src/services/profilePhotos';

const A = 'https://example.com/a.jpg';
const B = 'https://example.com/b.jpg';
const C = 'https://example.com/c.jpg';

beforeEach(() => {
  jest.clearAllMocks();
  mockPut.mockResolvedValue({ data: { message: 'Perfil atualizado com sucesso!' } });
});

describe('sanitizePhotos (T021)', () => {
  it('mantém a ordem e remove vazios, duplicados e valores que não são string', () => {
    expect(sanitizePhotos([A, '', B, '  ', A, 42, null, C])).toEqual([A, B, C]);
  });

  it('respeita o limite N da galeria', () => {
    const many = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.jpg`);
    expect(sanitizePhotos(many)).toHaveLength(MAX_PROFILE_PHOTOS);
  });

  it('retorna lista vazia para entradas que não são listas', () => {
    expect(sanitizePhotos(undefined)).toEqual([]);
    expect(sanitizePhotos('https://example.com/a.jpg')).toEqual([]);
  });
});

describe('photosFromProfile (T021)', () => {
  it('usa a lista photos quando existe', () => {
    expect(photosFromProfile({ photos: [A, B], foto_url: A })).toEqual([A, B]);
  });

  it('faz fallback para foto_url nos perfis antigos (T020)', () => {
    expect(photosFromProfile({ foto_url: A })).toEqual([A]);
    expect(photosFromProfile({})).toEqual([]);
  });
});

describe('operações da galeria (T021)', () => {
  it('addPhoto acrescenta no fim, sem virar a principal', () => {
    expect(addPhoto([A, B], C)).toEqual([A, B, C]);
    expect(getMainPhoto(addPhoto([A, B], C))).toBe(A);
  });

  it('removePhoto remove pelo índice', () => {
    expect(removePhoto([A, B, C], 1)).toEqual([A, C]);
    expect(removePhoto([A, B, C], 2)).toEqual([A, B]);
  });

  it('movePhoto troca as posições e ignora índices inválidos', () => {
    expect(movePhoto([A, B, C], 2, 1)).toEqual([A, C, B]);
    expect(movePhoto([A, B, C], 0, 2)).toEqual([B, C, A]);
    expect(movePhoto([A, B, C], 0, 0)).toEqual([A, B, C]);
    expect(movePhoto([A, B, C], -1, 1)).toEqual([A, B, C]);
    expect(movePhoto([A, B, C], 1, 9)).toEqual([A, B, C]);
  });

  it('setMainPhoto move a foto escolhida para a posição 0', () => {
    expect(setMainPhoto([A, B, C], 2)).toEqual([C, A, B]);
    expect(setMainPhoto([A, B, C], 0)).toEqual([A, B, C]);
    expect(getMainPhoto(setMainPhoto([A, B, C], 2))).toBe(C);
  });

  it('getMainPhoto devolve a posição 0 ou null para lista vazia', () => {
    expect(getMainPhoto([A, B])).toBe(A);
    expect(getMainPhoto([])).toBeNull();
  });
});

describe('persistProfilePhotos (T021)', () => {
  it('envia a lista ordenada e a foto principal para PUT /api/users/perfil', async () => {
    const result = await persistProfilePhotos([C, A, B]);

    expect(result).toEqual([C, A, B]);
    expect(mockPut).toHaveBeenCalledWith('/api/users/perfil', {
      photos: [C, A, B],
      foto_url: C,
    });
  });

  it('sincroniza foto_url com a posição 0 mesmo com lista vazia', async () => {
    await persistProfilePhotos([]);

    expect(mockPut).toHaveBeenCalledWith('/api/users/perfil', {
      photos: [],
      foto_url: null,
    });
  });

  it('propaga o erro da API para a tela exibir o alerta', async () => {
    mockPut.mockRejectedValue({ response: { data: { error: 'Sem conexão.' } } });

    await expect(persistProfilePhotos([A])).rejects.toEqual({
      response: { data: { error: 'Sem conexão.' } },
    });
  });
});
