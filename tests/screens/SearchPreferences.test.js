// tests/screens/SearchPreferences.test.js
// T027 — tela de filtros: carrega, edita e salva chamando onApply + goBack.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import SearchPreferences from '../../src/screens/SearchPreferences';

jest.mock('../../src/services/searchPreferences', () => {
  const actual = jest.requireActual('../../src/services/searchPreferences');
  return { ...actual, loadPreferences: jest.fn(), savePreferences: jest.fn() };
});

import { loadPreferences, savePreferences } from '../../src/services/searchPreferences';

function renderPrefs(params = {}) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const route = { params };
  render(<SearchPreferences navigation={navigation} route={route} />);
  return { navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  loadPreferences.mockResolvedValue({ minAge: 18, maxAge: 35, maxDistanceKm: 25, gender: 'all' });
  savePreferences.mockImplementation(async (p) => p);
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
});

describe('SearchPreferences — T027', () => {
  it('carrega os valores iniciais e permite trocar o grupo', async () => {
    renderPrefs();
    expect(await screen.findByTestId('max-distance')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('max-distance').props.children.join('')).toContain('25'));
    fireEvent.press(screen.getByTestId('gender-groups'));
    fireEvent.press(screen.getByTestId('max-distance-plus'));
    await waitFor(() => expect(screen.getByTestId('max-distance').props.children.join('')).toContain('26'));
  });

  it('salva, chama onApply e volta para a Discovery', async () => {
    const onApply = jest.fn();
    const { navigation } = renderPrefs({ initial: { minAge: 20, maxAge: 30, maxDistanceKm: 10, gender: 'all' }, onApply });
    await waitFor(() => expect(screen.getByTestId('btn-save')).toBeTruthy());
    fireEvent.press(screen.getByTestId('btn-save'));
    await waitFor(() => expect(savePreferences).toHaveBeenCalled());
    expect(onApply).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
