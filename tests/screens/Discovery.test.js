// tests/screens/Discovery.test.js
// FRONT-ONLY: garante que o redesign liquid glass mantém o fluxo do protótipo
// (baralho, ações e reinício) navegando pela bottom tab.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Discovery, { applyPreferences } from '../../src/screens/Discovery';
import { MOCK_PROFILES } from '../../src/screens/Discovery/mockProfiles';

jest.mock('../../src/services/searchPreferences', () => {
  const actual = jest.requireActual('../../src/services/searchPreferences');
  return { ...actual, loadPreferences: jest.fn(async () => actual.DEFAULT_PREFERENCES) };
});

function renderDiscovery() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(<Discovery navigation={navigation} />);
  return { navigation };
}

describe('Discovery — redesign liquid glass', () => {
  it('mostra a logo central e o botão de filtros', () => {
    renderDiscovery();
    expect(screen.getByTestId('discovery-brand')).toBeTruthy();
    expect(screen.getByTestId('btn-filters')).toBeTruthy();
  });

  it('abre a tela de filtros pelo botão do topo', () => {
    const { navigation } = renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-filters'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      'SearchPreferences',
      expect.objectContaining({ initial: expect.any(Object) })
    );
  });

  it('mostra o primeiro perfil do baralho mockado', () => {
    renderDiscovery();
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

  it('avança o baralho em cada ação e permite recomeçar', () => {
    renderDiscovery();
    fireEvent.press(screen.getByTestId('btn-like'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Juliana Ferraz');

    fireEvent.press(screen.getByTestId('btn-pass'));
    fireEvent.press(screen.getByTestId('btn-superlike'));
    fireEvent.press(screen.getByTestId('btn-like'));
    expect(screen.getByTestId('btn-restart')).toBeTruthy();

    fireEvent.press(screen.getByTestId('btn-restart'));
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
  });
});
