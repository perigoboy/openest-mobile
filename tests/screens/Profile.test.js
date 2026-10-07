// tests/screens/Profile.test.js
// T020 — troca de foto de perfil pela galeria/câmera com upload em FormData
// para POST /api/users/upload-photo (o backend salva no Cloudinary).

const mockLaunchImageLibraryAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args) => mockLaunchImageLibraryAsync(...args),
  launchCameraAsync: (...args) => mockLaunchCameraAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  requestCameraPermissionsAsync: (...args) => mockRequestCameraPermissionsAsync(...args),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    put: (...args) => mockPut(...args),
  },
}));

// O LinearGradient e os ícones dependem de módulos nativos que não rodam no Jest.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, colors, ...rest }) =>
      React.createElement(View, rest, children),
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import React from 'react';
import { Alert, Image } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import Profile from '../../src/screens/Profile';

const CLOUDINARY_URL =
  'https://res.cloudinary.com/openest/image/upload/v1/openest_uploads/foto.jpg';

// URLs da galeria ordenada usadas nos testes da T021 (posição 0 = principal).
const PHOTO_A =
  'https://res.cloudinary.com/openest/image/upload/v1/openest_uploads/foto-a.jpg';
const PHOTO_B =
  'https://res.cloudinary.com/openest/image/upload/v1/openest_uploads/foto-b.jpg';
const PHOTO_C =
  'https://res.cloudinary.com/openest/image/upload/v1/openest_uploads/foto-c.jpg';

function renderProfile() {
  render(<Profile navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
}

// Pressiona um elemento pelo testID (mesma abordagem dos testes da T025).
async function pressButton(testID) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

// Retorna o último Alert.alert registrado.
function lastAlert() {
  const calls = Alert.alert.mock.calls;
  return calls[calls.length - 1];
}

// Escolhe um botão do Alert (Galeria / Câmera / Cancelar).
// O botão "Cancelar" não tem onPress (só style: 'cancel').
async function chooseAlertOption(text) {
  const [, , buttons] = lastAlert();
  const option = buttons.find((button) => button.text === text);
  if (!option || typeof option.onPress !== 'function') return;
  await act(async () => {
    await option.onPress();
  });
}

// Verifica se alguma imagem da tela está usando a URL informada.
// RNTL v13: queries por tipo só existem com o prefixo UNSAFE_.
function hasImageWithUri(uri) {
  return screen
    .UNSAFE_getAllByType(Image)
    .some((image) => image.props.source && image.props.source.uri === uri);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    data: { name: 'Ana', email: 'ana@openest.com', foto_url: '' },
  });
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockPost.mockResolvedValue({
    data: { message: 'Foto de perfil atualizada com sucesso!', url: CLOUDINARY_URL },
  });
  mockPut.mockResolvedValue({
    data: { message: 'Perfil atualizado com sucesso!' },
  });
});

describe('Perfil — carregamento do perfil (T018/T020)', () => {
  it('busca o perfil na rota com prefixo /api e mostra a foto salva no Cloudinary', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: CLOUDINARY_URL },
    });

    renderProfile();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/users/perfil');
    });
    await waitFor(() => {
      expect(hasImageWithUri(CLOUDINARY_URL)).toBe(true);
    });
  });
});

describe('Perfil — troca de foto pela galeria (T020)', () => {
  it('pergunta a origem ao tocar no botão de trocar foto', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await pressButton('btn-change-photo');

    const [title, message, buttons] = lastAlert();
    expect(title).toBe('Trocar foto de perfil');
    expect(message).toBe('Escolha uma opção:');
    expect(buttons.map((button) => button.text)).toEqual([
      'Galeria',
      'Câmera',
      'Cancelar',
    ]);
  });

  it('envia a imagem da galeria em FormData para a API e atualiza a UI com a URL da nuvem', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///novo-perfil.jpg', fileName: 'novo-perfil.jpg', mimeType: 'image/jpeg' },
      ],
    });

    await pressButton('btn-change-photo');
    await chooseAlertOption('Galeria');

    expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true })
    );

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [endpoint, body, config] = mockPost.mock.calls[0];

    // FormData com o campo 'image' exigido pelo multer do backend
    expect(endpoint).toBe('/api/users/upload-photo');
    expect(body).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    if (typeof body.getParts === 'function') {
      expect(body.getParts().some((part) => part.name === 'image')).toBe(true);
    } else {
      expect(body.get('image')).toBeTruthy();
    }

    // Critério de aceite: imagem atualizada na UI e salva em nuvem
    await waitFor(() => {
      expect(hasImageWithUri(CLOUDINARY_URL)).toBe(true);
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sucesso',
      'Foto de perfil atualizada com sucesso!'
    );
  });

  it('não envia nada quando o usuário cancela o seletor de imagens', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

    await pressButton('btn-change-photo');
    await chooseAlertOption('Galeria');

    expect(mockLaunchImageLibraryAsync).toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('não abre o seletor quando a permissão da galeria é negada', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await pressButton('btn-change-photo');
    await chooseAlertOption('Galeria');

    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Permissão negada',
      'Precisamos de permissão para aceder à galeria.'
    );
  });
});

describe('Perfil — troca de foto pela câmera (T020)', () => {
  it('tira uma foto com a câmera e envia em FormData para a API', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///camera.jpg', fileName: 'camera.jpg', mimeType: 'image/jpeg' },
      ],
    });

    await pressButton('btn-change-photo');
    await chooseAlertOption('Câmera');

    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'] })
    );

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0][0]).toBe('/api/users/upload-photo');
    expect(mockPost.mock.calls[0][1]).toBeInstanceOf(FormData);
    expect(mockRequestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('não abre a câmera quando a permissão é negada', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await pressButton('btn-change-photo');
    await chooseAlertOption('Câmera');

    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Permissão negada',
      'Precisamos de permissão para usar a câmera.'
    );
  });
});

describe('Perfil — cancelamento e erros do upload (T020)', () => {
  it('ao cancelar o Alert não pede permissão nem envia imagem', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await pressButton('btn-change-photo');
    await chooseAlertOption('Cancelar');

    expect(mockRequestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(mockRequestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('mostra o erro da API quando o upload falha e libera o botão novamente', async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: 'Cloudinary indisponível.' } },
    });
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///falha.jpg', fileName: 'falha.jpg', mimeType: 'image/jpeg' },
      ],
    });

    await pressButton('btn-change-photo');
    await chooseAlertOption('Galeria');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Cloudinary indisponível.');
    });
    // uploading volta a false: o texto de envio some e o botão reage de novo
    expect(screen.queryByText('Enviando foto...')).toBeNull();
    expect(hasImageWithUri(CLOUDINARY_URL)).toBe(false);
  });
});

describe('Perfil — galeria de múltiplas fotos (T021)', () => {
  it('exibe apenas o botão adicionar quando o perfil ainda não tem fotos', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/users/perfil'));

    expect(screen.queryByTestId('photo-image-0')).toBeNull();
    expect(screen.getByTestId('btn-add-photo')).toBeTruthy();
    expect(screen.getByText('0/6')).toBeTruthy();
  });

  it('carrega a galeria ordenada da API e respeita a ordem no grid', async () => {
    mockGet.mockResolvedValue({
      data: {
        name: 'Ana',
        email: 'ana@openest.com',
        foto_url: PHOTO_A,
        photos: [PHOTO_A, PHOTO_B, PHOTO_C],
      },
    });

    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-2')).toBeTruthy());

    expect(screen.getByTestId('photo-image-0').props.source.uri).toBe(PHOTO_A);
    expect(screen.getByTestId('photo-image-1').props.source.uri).toBe(PHOTO_B);
    expect(screen.getByTestId('photo-image-2').props.source.uri).toBe(PHOTO_C);

    // A posição 0 é a foto principal: é ela que o Avatar (e o Card de
    // Descoberta, via foto_url/photos[0]) exibe.
    const uriImages = screen
      .UNSAFE_getAllByType(Image)
      .filter((image) => image.props.source && image.props.source.uri);
    expect(uriImages[0].props.source.uri).toBe(PHOTO_A);
  });

  it('adiciona foto no fim da galeria e persiste a ordem no backend', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-0')).toBeTruthy());

    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///nova.jpg', fileName: 'nova.jpg', mimeType: 'image/jpeg' }],
    });

    await pressButton('btn-add-photo');

    // Upload da imagem (T020) e depois gravação da lista ordenada (T021)
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0][0]).toBe('/api/users/upload-photo');

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    const [endpoint, body] = mockPut.mock.calls[0];
    expect(endpoint).toBe('/api/users/perfil');
    // A nova foto entra no fim; a principal permanece a mesma.
    expect(body).toEqual({ photos: [PHOTO_A, CLOUDINARY_URL], foto_url: PHOTO_A });

    expect(screen.getByTestId('photo-image-1').props.source.uri).toBe(CLOUDINARY_URL);
    expect(Alert.alert).toHaveBeenCalledWith('Sucesso', 'Foto adicionada à galeria!');
  });

  it('esconde o botão de adicionar ao atingir o limite N (6 fotos)', async () => {
    const six = Array.from(
      { length: 6 },
      (_, i) => `https://res.cloudinary.com/openest/image/upload/v1/openest_uploads/p${i}.jpg`
    );
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: six[0], photos: six },
    });

    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-tile-5')).toBeTruthy());

    expect(screen.getAllByTestId(/^photo-tile-/)).toHaveLength(6);
    expect(screen.queryByTestId('btn-add-photo')).toBeNull();
  });

  it('remove uma foto, mantém a principal e salva a nova lista', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A, PHOTO_B, PHOTO_C] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-2')).toBeTruthy());

    await pressButton('btn-remove-photo-1');
    await chooseAlertOption('Remover');

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut.mock.calls[0][1]).toEqual({
      photos: [PHOTO_A, PHOTO_C],
      foto_url: PHOTO_A,
    });

    await waitFor(() => expect(screen.queryByTestId('photo-image-2')).toBeNull());
    expect(screen.getByTestId('photo-image-1').props.source.uri).toBe(PHOTO_C);
  });

  it('impede remover a última foto do perfil', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-0')).toBeTruthy());

    await pressButton('btn-remove-photo-0');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Você precisa manter pelo menos uma foto no perfil.'
    );
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('move a foto com as setas do grid e persiste a nova ordem', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A, PHOTO_B, PHOTO_C] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-2')).toBeTruthy());

    // Move a última foto (C) uma posição para a esquerda
    await pressButton('btn-move-left-2');

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut.mock.calls[0][1]).toEqual({
      photos: [PHOTO_A, PHOTO_C, PHOTO_B],
      foto_url: PHOTO_A,
    });

    await waitFor(() => expect(screen.getByTestId('photo-image-1').props.source.uri).toBe(PHOTO_C));
    expect(screen.getByTestId('photo-image-2').props.source.uri).toBe(PHOTO_B);
  });

  it('define outra foto como principal e atualiza Avatar + ordem enviada', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A, PHOTO_B] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-1')).toBeTruthy());

    await pressButton('btn-set-main-1');

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut.mock.calls[0][1]).toEqual({
      photos: [PHOTO_B, PHOTO_A],
      foto_url: PHOTO_B,
    });

    // Grid e Avatar passam a usar a nova principal (posição 0)
    await waitFor(() => expect(screen.getByTestId('photo-image-0').props.source.uri).toBe(PHOTO_B));
    const uriImages = screen
      .UNSAFE_getAllByType(Image)
      .filter((image) => image.props.source && image.props.source.uri);
    expect(uriImages[0].props.source.uri).toBe(PHOTO_B);
    expect(screen.getByTestId('photo-main-badge-0')).toBeTruthy();
  });

  it('mostra o erro da API quando a nova ordem não pode ser salva', async () => {
    mockPut.mockRejectedValue({ response: { data: { error: 'Sem conexão.' } } });
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: PHOTO_A, photos: [PHOTO_A, PHOTO_B] },
    });
    renderProfile();
    await waitFor(() => expect(screen.queryByTestId('photo-image-1')).toBeTruthy());

    await pressButton('btn-move-right-0');

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Sem conexão.'));
  });
});


