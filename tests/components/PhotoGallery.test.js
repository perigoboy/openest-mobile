// tests/components/PhotoGallery.test.js
// T021 — grid de múltiplas fotos: ordem exibida, badge da foto principal,
// limite N no botão de adicionar e callbacks de remover/reordenar.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PhotoGallery from '../../src/components/PhotoGallery';
import { MAX_PROFILE_PHOTOS } from '../../src/services/profilePhotos';

const A = 'https://example.com/a.jpg';
const B = 'https://example.com/b.jpg';
const C = 'https://example.com/c.jpg';

function renderGallery(overrides = {}) {
  const props = {
    photos: [A, B, C],
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onMove: jest.fn(),
    onSetMain: jest.fn(),
    ...overrides,
  };
  render(<PhotoGallery {...props} />);
  return props;
}

describe('PhotoGallery — ordem e foto principal (T021)', () => {
  it('renderiza as fotos exatamente na ordem da lista', () => {
    renderGallery();

    expect(screen.getByTestId('photo-image-0').props.source.uri).toBe(A);
    expect(screen.getByTestId('photo-image-1').props.source.uri).toBe(B);
    expect(screen.getByTestId('photo-image-2').props.source.uri).toBe(C);
  });

  it('marca somente a posição 0 como principal', () => {
    renderGallery();

    expect(screen.getByTestId('photo-main-badge-0')).toBeTruthy();
    expect(screen.queryByTestId('photo-main-badge-1')).toBeNull();
    expect(screen.queryByTestId('photo-main-badge-2')).toBeNull();
  });
});

describe('PhotoGallery — limite N (T021)', () => {
  it('mostra o botão adicionar com o contador enquanto há espaço', () => {
    renderGallery({ photos: [A, B] });

    expect(screen.getByTestId('btn-add-photo')).toBeTruthy();
    expect(screen.getByText(`2/${MAX_PROFILE_PHOTOS}`)).toBeTruthy();
  });

  it('esconde o botão adicionar ao atingir o limite', () => {
    const six = Array.from(
      { length: MAX_PROFILE_PHOTOS },
      (_, i) => `https://example.com/${i}.jpg`
    );
    renderGallery({ photos: six });

    expect(screen.queryByTestId('btn-add-photo')).toBeNull();
    expect(screen.getAllByTestId(/^photo-tile-/)).toHaveLength(MAX_PROFILE_PHOTOS);
  });
});

describe('PhotoGallery — ações (T021)', () => {
  it('chama onAdd ao tocar em adicionar', () => {
    const props = renderGallery({ photos: [A] });

    fireEvent.press(screen.getByTestId('btn-add-photo'));

    expect(props.onAdd).toHaveBeenCalledTimes(1);
  });

  it('chama onRemove com o índice da foto removida', () => {
    const props = renderGallery();

    fireEvent.press(screen.getByTestId('btn-remove-photo-1'));

    expect(props.onRemove).toHaveBeenCalledWith(1);
  });

  it('chama onMove com origem e destino das setas ←/→', () => {
    const props = renderGallery();

    fireEvent.press(screen.getByTestId('btn-move-right-0'));
    fireEvent.press(screen.getByTestId('btn-move-left-2'));

    expect(props.onMove).toHaveBeenNthCalledWith(1, 0, 1);
    expect(props.onMove).toHaveBeenNthCalledWith(2, 2, 1);
  });

  it('chama onSetMain com o índice da foto escolhida', () => {
    const props = renderGallery();

    fireEvent.press(screen.getByTestId('btn-set-main-2'));

    expect(props.onSetMain).toHaveBeenCalledWith(2);
  });

  it('não dispara as setas nas bordas da lista', () => {
    const props = renderGallery();

    fireEvent.press(screen.getByTestId('btn-move-left-0'));
    fireEvent.press(screen.getByTestId('btn-set-main-0'));
    fireEvent.press(screen.getByTestId('btn-move-right-2'));

    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onSetMain).not.toHaveBeenCalled();
  });

  it('bloqueia as ações quando disabled (durante upload)', () => {
    const props = renderGallery({ disabled: true });

    fireEvent.press(screen.getByTestId('btn-add-photo'));
    fireEvent.press(screen.getByTestId('btn-remove-photo-0'));
    fireEvent.press(screen.getByTestId('btn-move-right-0'));

    expect(props.onAdd).not.toHaveBeenCalled();
    expect(props.onRemove).not.toHaveBeenCalled();
    expect(props.onMove).not.toHaveBeenCalled();
  });
});
