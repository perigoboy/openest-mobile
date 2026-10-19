// tests/screens/Discovery.test.js
// FRONT-ONLY: garante que o redesign liquid glass mantém o fluxo do protótipo
// (baralho, ações e reinício) navegando pela bottom tab.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Discovery from '../../src/screens/Discovery';

describe('Discovery — redesign liquid glass', () => {
  it('mostra a logo central e a pílula de filtro legível', () => {
    render(<Discovery />);
    expect(screen.getByTestId('discovery-brand')).toBeTruthy();
    expect(screen.getByText('Perto de mim')).toBeTruthy();
  });

  it('mostra o primeiro perfil do baralho mockado', () => {
    render(<Discovery />);
    expect(screen.getByTestId('discovery-card')).toBeTruthy();
    expect(screen.getByTestId('discovery-name').props.children.join('')).toContain('Julio e Talita');
  });

  it('avança o baralho em cada ação e permite recomeçar', () => {
    render(<Discovery />);
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
