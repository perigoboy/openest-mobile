// tests/screens/PhotoVerification.test.js
// T023 — tela de verificação de selfie: captura na câmera frontal,
// POST /api/users/verify-photo em FormData e selo "Verificado" após aprovação.

const mockLaunchCameraAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  launchCameraAsync: (...args) => mockLaunchCameraAsync(...args),
  requestCameraPermissionsAsync: (...args) =>
    mockRequestCameraPermissionsAsync(...args),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}));

// Módulos nativos que não rodam no Jest (mesmos mocks dos testes da T020).
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
import { Alert } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '../../src/components';
import PhotoVerification from '../../src/screens/PhotoVerification';

const SELFIE_URI = 'file:///selfie.jpg';
const SELFIE_URL = 'https://res.cloudinary.com/openest/image/upload/v1/selfie.png';

function renderPhotoVerification(navigation = { navigate: jest.fn(), goBack: jest.fn() }) {
  render(
    <ToastProvider>
      <PhotoVerification navigation={navigation} />
    </ToastProvider>
  );
}

// Pressiona um elemento pelo testID (mesma abordagem dos testes da T025).
async function pressButton(testID) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

// Espera o fim do carregamento inicial (GET /api/users/perfil).
async function waitForReady() {
  await waitFor(() => expect(screen.getByTestId('btn-take-selfie')).toBeTruthy());
}

// Habilita permissão + câmera frontal retornando a selfie pronta.
function mockCameraSuccess() {
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockLaunchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: SELFIE_URI, fileName: 'selfie.jpg', mimeType: 'image/jpeg' }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: { name: 'Ana', verificado: false } });
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
  mockPost.mockResolvedValue({
    data: {
      message: 'Selfie recebida e aprovada! Seu perfil agora está verificado.',
      verificado: true,
      selfie_url: SELFIE_URL,
    },
  });
});

describe('PhotoVerification — instruções e captura da selfie', () => {
  it('explica o fluxo e oferece o botão de captura quando ainda não é verificado', async () => {
    renderPhotoVerification();
    await waitForReady();

    expect(screen.getByText('Verificação de Foto')).toBeTruthy();
    expect(screen.getByText('Como funciona')).toBeTruthy();
    expect(screen.getByTestId('btn-take-selfie')).toBeTruthy();
    expect(screen.queryByTestId('badge-verificado')).toBeNull();
  });

  it('pede permissão da câmera, abre a câmera frontal e mostra a prévia', async () => {
    mockCameraSuccess();
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');

    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    expect(mockLaunchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ cameraType: 'front', mediaTypes: ['images'] })
    );
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());
    expect(screen.getByTestId('btn-submit-selfie')).toBeTruthy();
    expect(screen.getByTestId('btn-retake-selfie')).toBeTruthy();
  });

  it('não mostra prévia quando o usuário cancela a câmera', async () => {
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');

    expect(mockLaunchCameraAsync).toHaveBeenCalled();
    expect(screen.queryByTestId('image-selfie-preview')).toBeNull();
    expect(screen.getByTestId('btn-take-selfie')).toBeTruthy();
  });

  it('avisa quando a permissão da câmera é negada', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');

    expect(Alert.alert).toHaveBeenCalledWith('Permissão negada', expect.any(String));
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it('descarta a selfie e volta para a captura ao tocar em "Tirar outra"', async () => {
    mockCameraSuccess();
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());

    await pressButton('btn-retake-selfie');

    expect(screen.queryByTestId('image-selfie-preview')).toBeNull();
    expect(screen.getByTestId('btn-take-selfie')).toBeTruthy();
  });
});
describe('PhotoVerification — envio e selo "Verificado" (critério de aceite)', () => {
  it('dispara POST /api/users/verify-photo em FormData com a selfie', async () => {
    mockCameraSuccess();
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());

    await pressButton('btn-submit-selfie');

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    const [endpoint, body, config] = mockPost.mock.calls[0];

    expect(endpoint).toBe('/api/users/verify-photo');
    expect(body).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    if (typeof body.getParts === 'function') {
      expect(body.getParts().some((part) => part.name === 'image')).toBe(true);
    } else {
      expect(body.get('image')).toBeTruthy();
    }
  });

  it('exibe o selo "Verificado" depois que a API aprova a selfie', async () => {
    mockCameraSuccess();
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());

    await pressButton('btn-submit-selfie');

    // Critério de aceite: selo na tela após a confirmação da API.
    await waitFor(() => expect(screen.getByTestId('badge-verificado')).toBeTruthy());
    expect(screen.getByText('Verificado')).toBeTruthy();
    expect(screen.getByText('Seu perfil está verificado')).toBeTruthy();
    expect(screen.queryByTestId('image-selfie-preview')).toBeNull();
  });

  it('informa que a selfie entrou em análise quando a API não aprova de imediato', async () => {
    mockCameraSuccess();
    mockPost.mockResolvedValue({ data: { message: 'Em análise.', verificado: false } });
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());
    await pressButton('btn-submit-selfie');

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Em análise', expect.any(String)));
    expect(screen.queryByTestId('badge-verificado')).toBeNull();
  });

  it('mostra a mensagem de erro da API quando o envio falha', async () => {
    mockCameraSuccess();
    mockPost.mockRejectedValue({
      response: { data: { error: 'Selfie inválida.' } },
    });
    renderPhotoVerification();
    await waitForReady();

    await pressButton('btn-take-selfie');
    await waitFor(() => expect(screen.getByTestId('image-selfie-preview')).toBeTruthy());
    await pressButton('btn-submit-selfie');

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Selfie inválida.')
    );
    expect(screen.queryByTestId('badge-verificado')).toBeNull();
  });
});

describe('PhotoVerification — status já verificado', () => {
  it('abre direto no selo quando o perfil já veio verificado da API', async () => {
    mockGet.mockResolvedValue({ data: { name: 'Ana', verificado: true } });
    renderPhotoVerification();

    await waitFor(() => expect(screen.getByTestId('panel-verificado')).toBeTruthy());
    expect(screen.getByTestId('badge-verificado')).toBeTruthy();
    expect(screen.queryByTestId('btn-take-selfie')).toBeNull();
  });

  it('permite refazer a verificação a partir do painel de aprovado', async () => {
    mockGet.mockResolvedValue({ data: { name: 'Ana', verificado: true } });
    renderPhotoVerification();

    await waitFor(() => expect(screen.getByTestId('panel-verificado')).toBeTruthy());
    await pressButton('btn-reverify');

    expect(screen.getByTestId('btn-take-selfie')).toBeTruthy();
    expect(screen.queryByTestId('badge-verificado')).toBeNull();
  });
});

describe('PhotoVerification — navegação', () => {
  it('volta para a tela anterior pelo botão do cabeçalho', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    renderPhotoVerification(navigation);
    await waitForReady();

    await pressButton('btn-go-back');

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});

