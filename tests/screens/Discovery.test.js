// tests/screens/Discovery.test.js
// T030 — Discovery Engine: a tela consome fetchCompatibleProfiles (mockado)
// e exibe o baralho vindo da API; os testes de filtragem continuam cobrindo a
// função pura applyPreferences (T027/T028).
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import Discovery, { applyPreferences } from '../../src/screens/Discovery';
import { MOCK_PROFILES } from '../../src/screens/Discovery/mockProfiles';
import { fetchCompatibleProfiles } from '../../src/services/discovery';
import { likeProfile } from '../../src/services/interactions';
import { DiscoveryCard } from '../../src/components';

jest.mock('../../src/services/searchPreferences', () => {
  const actual = jest.requireActual('../../src/services/searchPreferences');
  return { ...actual, loadPreferences: jest.fn(async () => actual.DEFAULT_PREFERENCES) };
});

// Mock do serviço T030: o baralho passa a vir da API (aqui devolvemos o
// MOCK_PROFILES já no shape normalizado do card para os testes de fluxo).
jest.mock('../../src/services/discovery', () => {
  const actual = jest.requireActual('../../src/services/discovery');
  const { MOCK_PROFILES: profiles } = jest.requireActual('../../src/screens/Discovery/mockProfiles');
  return {
    ...actual,
    fetchCompatibleProfiles: jest.fn(async () => ({
      profiles,
      hasMore: false,
      total: profiles.length,
    })),
  };
});

jest.mock('../../src/services/interactions', () => ({
  likeProfile: jest.fn(),
}));

jest.mock('../../src/components', () => {
  const ReactActual = require('react');
  const actual = jest.requireActual('../../src/components');
  return {
    ...actual,
    // Envolve o card real registrando as props: permite testar o onSwipe do
    // gesto de swipe (T032) mantendo a renderização verdadeira nos demais
    // testes deste arquivo.
    DiscoveryCard: jest.fn((props) => ReactActual.createElement(actual.DiscoveryCard, props)),
  };
});

async function renderDiscovery() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(<Discovery navigation={navigation} />);
  // Aguarda a resolução do fetch da API (T030) antes das asserções do baralho.
  await screen.findByTestId('discovery-card');
  return { navigation };
}

beforeEach(() => {
  likeProfile.mockResolvedValue(false);
});

describe('Discovery — redesign liquid glass', () => {
  it('busca os perfis compatíveis na API na montagem (T030)', async () => {
    await renderDiscovery();
    expect(fetchCompatibleProfiles).toHaveBeenCalledTimes(1);
  });

  it('mostra a logo central e o botão de filtros', async () => {
    await renderDiscovery();
    expect(screen.getByTestId('discovery-brand')).toBeTruthy();
    expect(screen.getByTestId('btn-filters')).toBeTruthy();
  });

  it('abre a tela de filtros pelo botão do topo', async () => {
    const { navigation } = await renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-filters'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      'SearchPreferences',
      expect.objectContaining({ initial: expect.any(Object) })
    );
  });

  it('navega para Configurações ao tocar na foto do próprio usuário', async () => {
    const { navigation } = await renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-my-avatar'));
    expect(navigation.navigate).toHaveBeenCalledWith('Settings');
  });

  it('mostra o primeiro perfil devolvido pela API', async () => {
    await renderDiscovery();
    expect(screen.getByTestId('discovery-card')).toBeTruthy();
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
  });

  it('filtra o baralho por distância, idade e grupo (T027)', () => {
    expect(applyPreferences(MOCK_PROFILES, { minAge: 18, maxAge: 35, maxDistanceKm: 1, gender: 'all' }).map((p) => p.name))
      .toEqual(['Juliana Ferraz']);
    expect(applyPreferences(MOCK_PROFILES, { minAge: 26, maxAge: 26, maxDistanceKm: 500, gender: 'all' }).map((p) => p.name))
      .toEqual(['Juliana Ferraz', 'Julia Maria', 'Sofia Espanha']);
    expect(applyPreferences(MOCK_PROFILES, { minAge: 18, maxAge: 35, maxDistanceKm: 500, gender: 'groups' }).map((p) => p.name))
      .toEqual(['Julia Maria', 'Sofia Espanha']);
    expect(applyPreferences(MOCK_PROFILES, { minAge: 40, maxAge: 50, maxDistanceKm: 500, gender: 'all' })).toEqual([]);
  });

  it('registra o like antes de avançar o baralho e permite recomeçar', async () => {
    await renderDiscovery();
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-like'));
    });
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');
    expect(likeProfile).toHaveBeenCalledWith(MOCK_PROFILES[0].id);

    fireEvent.press(screen.getByTestId('btn-pass'));
    fireEvent.press(screen.getByTestId('btn-superlike'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-like'));
    });
    expect(screen.getByTestId('btn-restart')).toBeTruthy();

    fireEvent.press(screen.getByTestId('btn-restart'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
  });

  it('abre o modal com as duas fotos quando a API confirma o match', async () => {
    likeProfile.mockResolvedValueOnce(true);
    const { navigation } = await renderDiscovery();

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-like'));
    });

    expect(screen.getByText("It's a Match!")).toBeTruthy();
    expect(screen.getByTestId('match-modal-user-photo').props.source.uri).toContain('ui-avatars.com');
    expect(screen.getByTestId('match-modal-profile-photo').props.source.uri).toBe(MOCK_PROFILES[0].photo);

    fireEvent.press(screen.getByTestId('btn-match-chat'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      'Chat',
      { contact: expect.objectContaining({ name: 'Julio e Talita' }) }
    );
    expect(screen.queryByText("It's a Match!")).toBeNull();
  });

  it('informa falha ao curtir e avança sem exibir falso match', async () => {
    likeProfile.mockRejectedValueOnce(new Error('Network unavailable'));
    await renderDiscovery();

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-like'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Não foi possível curtir',
      'Tente novamente em instantes.'
    );
    expect(screen.queryByText("It's a Match!")).toBeNull();
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');
  });

  it('calcula a distância real (Haversine) quando há coordenadas (T028)', () => {
    // Perfis com lat/long (formato previsto para o backend do Discovery Engine).
    const nearby = { name: 'Perto', age: 26, latitude: -3.7172, longitude: -38.5005, kind: 'single' };
    const far = { name: 'Longe', age: 26, latitude: -3.7907, longitude: -38.5069, kind: 'single' };
    // Usuário em Fortaleza centro: Perto (~3,1 km) passa; Longe (~7 km) é cortado a 5 km.
    const user = { latitude: -3.7277, longitude: -38.5267 };
    expect(applyPreferences([nearby, far], { minAge: 18, maxAge: 35, maxDistanceKm: 5, gender: 'all' }, user).map((p) => p.name))
      .toEqual(['Perto']);
    // Sem localização do usuário e sem string "distance", a distância fica
    // infinita e o filtro corta de forma conservadora.
    expect(applyPreferences([nearby, far], { minAge: 18, maxAge: 35, maxDistanceKm: 2, gender: 'all' })).toEqual([]);
  });

  it('swipe no card aciona a mesma lógica dos botões (T032)', async () => {
    DiscoveryCard.mockClear();
    await renderDiscovery();

    const props = DiscoveryCard.mock.calls[DiscoveryCard.mock.calls.length - 1][0];
    expect(typeof props.onSwipe).toBe('function');

    // O swipe para a direita usa a mesma API do botão Like.
    await act(async () => props.onSwipe('like'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');
    expect(likeProfile).toHaveBeenCalledWith(MOCK_PROFILES[0].id);

    await act(async () => props.onSwipe('pass'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julia Maria');
  });
});
