// tests/screens/Profile.test.js
// T020 — troca de foto de perfil pela galeria/câmera com upload em FormData
// para POST /api/users/upload-photo (o backend salva no Cloudinary).
// T022 — Modo Discreto: Switch que dispara PATCH /api/users/perfil para a
// flag modo_discreto, com aviso de impacto e rollback em caso de erro.

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
const mockPatch = jest.fn();

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    patch: (...args) => mockPatch(...args),
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

// Texto de impacto devolvido pela API no PATCH (T022).
const IMPACTO_ATIVADO =
  'Seu perfil deixa de aparecer no Discovery para todos os usuários. ' +
  'Matches e conversas ativos continuam funcionando e seu nome fica oculto ' +
  'nas notificações de mensagem.';
const IMPACTO_DESATIVADO =
  'Seu perfil volta a aparecer no Discovery e seu nome volta a ser exibido ' +
  'nas notificações de mensagem.';

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
  mockPatch.mockResolvedValue({
    data: {
      message: 'Modo Discreto ativado com sucesso!',
      modo_discreto: true,
      impacto: IMPACTO_ATIVADO,
    },
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

describe('Perfil — Modo Discreto (T022)', () => {
  it('carrega o modo_discreto salvo no banco e reflete no Switch', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: '', modo_discreto: true },
    });

    renderProfile();

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/users/perfil'));
    await waitFor(() =>
      expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(true)
    );
    // Status visível para o usuário (impacto no card)
    expect(screen.getByText('Ativado — perfil oculto no Discovery')).toBeTruthy();
  });

  it('inicia desativado quando a API não devolve a flag', async () => {
    renderProfile();

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(false)
    );
    expect(screen.getByText('Desativado — perfil visível no Discovery')).toBeTruthy();
  });

  it('dispara PATCH /api/users/perfil ao ativar e avisa o usuário do impacto', async () => {
    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await act(async () => {
      fireEvent(screen.getByTestId('switch-modo-discreto'), 'valueChange', true);
    });

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    const [endpoint, body] = mockPatch.mock.calls[0];
    expect(endpoint).toBe('/api/users/perfil');
    expect(body).toEqual({ modo_discreto: true });

    expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith('Modo Discreto ativado', IMPACTO_ATIVADO);
  });

  it('desativa com PATCH false e informa que o perfil volta ao Discovery', async () => {
    mockGet.mockResolvedValue({
      data: { name: 'Ana', email: 'ana@openest.com', foto_url: '', modo_discreto: true },
    });
    mockPatch.mockResolvedValue({
      data: { message: 'Modo Discreto desativado com sucesso!', modo_discreto: false, impacto: IMPACTO_DESATIVADO },
    });

    renderProfile();
    await waitFor(() =>
      expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(true)
    );

    await act(async () => {
      fireEvent(screen.getByTestId('switch-modo-discreto'), 'valueChange', false);
    });

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch.mock.calls[0][1]).toEqual({ modo_discreto: false });
    expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Modo Discreto desativado', IMPACTO_DESATIVADO);
  });

  it('reverte o Switch e mostra o erro quando a API recusa', async () => {
    mockPatch.mockRejectedValue({ response: { data: { error: 'Sem conexão.' } } });

    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await act(async () => {
      fireEvent(screen.getByTestId('switch-modo-discreto'), 'valueChange', true);
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Sem conexão.'));
    // Rollback: o banco não mudou, então a UI volta ao estado anterior
    expect(screen.getByTestId('switch-modo-discreto').props.value).toBe(false);
  });

  it('ignora toques enquanto o PATCH está em andamento', async () => {
    let resolvePatch;
    mockPatch.mockImplementation(
      () => new Promise((resolve) => { resolvePatch = resolve; })
    );

    renderProfile();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    await act(async () => {
      fireEvent(screen.getByTestId('switch-modo-discreto'), 'valueChange', true);
    });
    await act(async () => {
      fireEvent(screen.getByTestId('switch-modo-discreto'), 'valueChange', false);
    });

    expect(mockPatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePatch({ data: { modo_discreto: true, impacto: IMPACTO_ATIVADO } });
    });
  });
});


