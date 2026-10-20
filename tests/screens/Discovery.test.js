// tests/screens/Discovery.test.js
// T030 — Discovery Engine: a tela consome fetchCompatibleProfiles (mockado)
// e exibe o baralho vindo da API; os testes de filtragem continuam cobrindo a
// função pura applyPreferences (T027/T028).
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import Discovery, { applyPreferences } from '../../src/screens/Discovery';
import { MOCK_PROFILES } from '../../src/screens/Discovery/mockProfiles';
import { fetchCompatibleProfiles, undoInteraction } from '../../src/services/discovery';
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
    // T034 — reversão da última ação no backend (evita rede real nos testes).
    undoInteraction: jest.fn(async () => ({ message: 'Interação desfeita!' })),
  };
});

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

beforeEach(() => {
  // Zera contadores/chamadas entre testes; as implementações dos mocks
  // (definidas nos factories) são preservadas pelo clearAllMocks.
  jest.clearAllMocks();
});

async function renderDiscovery() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(<Discovery navigation={navigation} />);
  // Aguarda a resolução do fetch da API (T030) antes das asserções do baralho.
  await screen.findByTestId('discovery-card');
  return { navigation };
}

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

  it('avança o baralho em cada ação e recarrega quando ele acaba (T031)', async () => {
    await renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-like'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');

    fireEvent.press(screen.getByTestId('btn-pass'));
    fireEvent.press(screen.getByTestId('btn-superlike'));
    fireEvent.press(screen.getByTestId('btn-like'));

    // Esgotou o baralho: estado vazio com ação de recarregar (nunca em branco).
    expect(screen.getByTestId('discovery-empty')).toBeTruthy();
    expect(screen.getByText('Não há mais perfis por aqui')).toBeTruthy();

    fireEvent.press(screen.getByTestId('btn-reload'));
    // O recarregar refaz o GET; como todos os 4 perfis mockados foram
    // avaliados, o cache T033 os filtra e o estado vazio permanece.
    await waitFor(() => expect(fetchCompatibleProfiles).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('discovery-empty')).toBeTruthy();
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

    // Mesmo efeito dos botões Like/Pass: avança o baralho.
    await act(async () => props.onSwipe('like'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');

    await act(async () => props.onSwipe('pass'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julia Maria');
  });
});

describe('Discovery — estados de loading e vazio (T031)', () => {
  it('exibe o skeleton enquanto a API não responde (nunca em branco)', async () => {
    // Deixa o fetch pendente para segurar a tela no estado de carregamento.
    let resolveFetch;
    fetchCompatibleProfiles.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(<Discovery navigation={navigation} />);

    expect(screen.getByTestId('discovery-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('discovery-card')).toBeNull();

    // Flush das microtasks: o effect inicia com await loadPreferences() e só
    // então chama o fetch (que captura o resolve para o teste controlar).
    await act(async () => {});
    expect(fetchCompatibleProfiles).toHaveBeenCalledTimes(1);

    await act(async () => resolveFetch({ profiles: MOCK_PROFILES, hasMore: false, total: MOCK_PROFILES.length }));
    expect(screen.getByTestId('discovery-card')).toBeTruthy();
    expect(screen.queryByTestId('discovery-skeleton')).toBeNull();
  });

  it('mostra estado vazio com botão de recarregar quando a API não devolve perfis', async () => {
    fetchCompatibleProfiles.mockResolvedValueOnce({ profiles: [], hasMore: false, total: 0 });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(<Discovery navigation={navigation} />);

    expect(await screen.findByTestId('discovery-empty')).toBeTruthy();
    expect(screen.getByText('Não há mais perfis por aqui')).toBeTruthy();
    expect(screen.getByTestId('btn-reload')).toBeTruthy();
    // Ações ficam desabilitadas sem card — nada de baralho invisível ativo.
    expect(screen.getByTestId('btn-like').props.accessibilityState?.disabled ?? screen.getByTestId('btn-like').props.disabled).toBe(true);
  });

  it('mostra estado de erro com "Tentar novamente" quando a API falha (T031)', async () => {
    fetchCompatibleProfiles.mockRejectedValueOnce(new Error('network'));
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(<Discovery navigation={navigation} />);

    expect(await screen.findByTestId('discovery-empty')).toBeTruthy();
    expect(screen.getByText('Não foi possível carregar os perfis')).toBeTruthy();
    const reload = screen.getByTestId('btn-reload');
    expect(reload).toBeTruthy();

    // "Tentar novamente" refaz o GET e recupera o baralho.
    fireEvent.press(reload);
    expect(await screen.findByTestId('discovery-card')).toBeTruthy();
    expect(fetchCompatibleProfiles).toHaveBeenCalledTimes(2);
  });
});

describe('Discovery — cache local de perfis já vistos (T033)', () => {
  it('não repete na recarga os perfis avaliados por swipe e botão', async () => {
    const [first, second, third] = MOCK_PROFILES;
    // 1ª busca devolve dois perfis; a recarga devolve os mesmos + um novo.
    fetchCompatibleProfiles
      .mockResolvedValueOnce({ profiles: [first, second], hasMore: false, total: 2 })
      .mockResolvedValueOnce({ profiles: [first, second, third], hasMore: true, total: 3 });

    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(<Discovery navigation={navigation} />);
    expect((await screen.findByTestId('discovery-name')).props.children.join('')).toContain(first.name);

    // Avalia o primeiro via swipe (T032) e o segundo pelo botão de like.
    const props = DiscoveryCard.mock.calls[DiscoveryCard.mock.calls.length - 1][0];
    await act(async () => props.onSwipe('pass'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain(second.name);
    fireEvent.press(screen.getByTestId('btn-like'));
    expect(screen.getByTestId('discovery-empty')).toBeTruthy();

    // Recarrega: first e second já foram vistos na sessão, só third entra.
    fireEvent.press(screen.getByTestId('btn-reload'));
    expect((await screen.findByTestId('discovery-name')).props.children.join('')).toContain(third.name);
    expect(screen.queryByText(new RegExp(first.name))).toBeNull();
  });
});

describe('Discovery — desfazer último swipe (T034)', () => {
  it('não mostra o botão Desfazer antes de nenhuma avaliação', async () => {
    await renderDiscovery();
    expect(screen.queryByTestId('btn-undo')).toBeNull();
  });

  it('desfaz o último like: reverte na API, remove do cache e devolve o card ao topo', async () => {
    const { navigation } = await renderDiscovery(); // baralho: Julio, Juliana, Julia, Sofia

    fireEvent.press(screen.getByTestId('btn-like')); // avalia Julio e Talita
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');
    expect(screen.getByTestId('btn-undo')).toBeTruthy();

    fireEvent.press(screen.getByTestId('btn-undo'));
    await waitFor(() => expect(undoInteraction).toHaveBeenCalledWith('proto-casal-1'));

    // Card de volta ao TOPO da pilha (index 0).
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
    // Undo de nível único: botão some até a próxima avaliação.
    expect(screen.queryByTestId('btn-undo')).toBeNull();

    // O ID saiu do cache de vistos: recarregar via filtros traz o perfil de
    // volta (se ainda estivesse no cache, viria Juliana no lugar).
    fireEvent.press(screen.getByTestId('btn-filters'));
    const params = navigation.navigate.mock.calls.find(([name]) => name === 'SearchPreferences')[1];
    await act(async () => params.onApply({ minAge: 18, maxAge: 35, maxDistanceKm: 25, gender: 'all' }));
    expect(fetchCompatibleProfiles).toHaveBeenCalledTimes(2);
    expect((await screen.findByTestId('discovery-name')).props.children.join('')).toContain('Julio e Talita');
  });

  it('desfaz a ação vinda do gesto de swipe (T032 + T034)', async () => {
    DiscoveryCard.mockClear();
    await renderDiscovery();

    const props = DiscoveryCard.mock.calls[DiscoveryCard.mock.calls.length - 1][0];
    await act(async () => props.onSwipe('like'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');

    fireEvent.press(screen.getByTestId('btn-undo'));
    await waitFor(() => expect(undoInteraction).toHaveBeenCalledWith('proto-casal-1'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
  });

  it('desfaz quando o baralho esgotou, saindo do estado vazio', async () => {
    await renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-like'));
    fireEvent.press(screen.getByTestId('btn-pass'));
    fireEvent.press(screen.getByTestId('btn-superlike'));
    fireEvent.press(screen.getByTestId('btn-like')); // esgota: Sofia avaliada
    expect(screen.getByTestId('discovery-empty')).toBeTruthy();

    fireEvent.press(screen.getByTestId('btn-undo'));
    await waitFor(() => expect(undoInteraction).toHaveBeenCalledWith('proto-sofia'));
    expect(screen.queryByTestId('discovery-empty')).toBeNull();
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Sofia Espanha');
  });

  it('falha de rede no backend não impede o restore local do card', async () => {
    undoInteraction.mockRejectedValueOnce(Object.assign(new Error('offline'), { response: { status: 500 } }));
    await renderDiscovery();

    fireEvent.press(screen.getByTestId('btn-like'));
    fireEvent.press(screen.getByTestId('btn-undo'));

    // Restore local imediato (console.error é capturado globalmente no setup).
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
    await waitFor(() => expect(undoInteraction).toHaveBeenCalledTimes(1));
  });
});
