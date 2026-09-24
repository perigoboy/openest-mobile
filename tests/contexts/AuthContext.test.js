// __tests__/contexts/AuthContext.test.js
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../../src/services/api';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Mock do axios (api.js) — controlamos as respostas em cada teste
// ─────────────────────────────────────────────────────────────
jest.mock('../../src/services/api', () => ({
  post: jest.fn(),
}));

// ─────────────────────────────────────────────────────────────
// Componente de teste — consome o contexto e expõe os botões
// que disparam as ações pra gente poder inspecionar o estado.
// ─────────────────────────────────────────────────────────────
function TestConsumer() {
  const { signed, user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <>
      <Text testID="signed">{String(signed)}</Text>
      <Text testID="user">{user ? JSON.stringify(user) : 'null'}</Text>
      <Text testID="loading">{String(loading)}</Text>
      <TouchableOpacity testID="btn-signin" onPress={() => signIn('a@b.com', 'senha123').catch(() => {})}>
        <Text>signIn</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-signup"
        onPress={() => signUp('Ana', 'a@b.com', 'senha123', 'solteiro').catch(() => {})}
      >
        <Text>signUp</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="btn-signout" onPress={signOut}>
        <Text>signOut</Text>
      </TouchableOpacity>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Reset entre testes
// ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  // Por padrão, o SecureStore começa vazio
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  SecureStore.deleteItemAsync.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────
// TESTES
// ─────────────────────────────────────────────────────────────

describe('AuthContext — carregamento inicial', () => {
  it('começa deslogado quando não há token salvo no SecureStore', async () => {
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    });

    expect(screen.getByTestId('signed').props.children).toBe('false');
    expect(screen.getByTestId('user').props.children).toBe('null');
  });

  it('carrega o usuário do SecureStore quando há token salvo', async () => {
    const fakeUser = { id: 1, name: 'Ana', email: 'ana@test.com' };
    SecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'user_token') return Promise.resolve('jwt-fake');
      if (key === 'user_data') return Promise.resolve(JSON.stringify(fakeUser));
      return Promise.resolve(null);
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId('signed').props.children).toBe('true');
    });

    expect(screen.getByTestId('user').props.children).toBe(JSON.stringify(fakeUser));
  });
});

describe('AuthContext — signIn', () => {
  it('salva token e user no SecureStore e atualiza o estado em caso de sucesso', async () => {
    const fakeUser = { id: 1, name: 'Ana', email: 'ana@test.com' };
    api.post.mockResolvedValueOnce({
      data: { token: 'jwt-fake', user: fakeUser },
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-signin'));
    });

    expect(api.post).toHaveBeenCalledWith('/api/users/login', {
      email: 'a@b.com',
      password: 'senha123',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_token', 'jwt-fake');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_data', JSON.stringify(fakeUser));
    expect(screen.getByTestId('signed').props.children).toBe('true');
  });

  it('propaga o erro e NÃO salva no SecureStore quando a API falha', async () => {
    api.post.mockRejectedValueOnce(new Error('401 Unauthorized'));

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-signin'));
    });

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('signed').props.children).toBe('false');
  });
});

describe('AuthContext — signUp', () => {
  it('realiza auto-login salvando token e user após cadastro com sucesso', async () => {
    const fakeUser = { id: 2, name: 'Bia', email: 'bia@test.com' };
    api.post.mockResolvedValueOnce({
      data: { token: 'jwt-signup', user: fakeUser },
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-signup'));
    });

    expect(api.post).toHaveBeenCalledWith('/api/users/register', {
      name: 'Ana',
      email: 'a@b.com',
      password: 'senha123',
      status_relacionamento: 'solteiro',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user_token', 'jwt-signup');
    expect(screen.getByTestId('signed').props.children).toBe('true');
  });
});

describe('AuthContext — signOut', () => {
  it('remove token e user do SecureStore e reseta o estado', async () => {
    const fakeUser = { id: 1, name: 'Ana', email: 'ana@test.com' };
    api.post.mockResolvedValueOnce({
      data: { token: 'jwt-fake', user: fakeUser },
    });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    // primeiro faz login
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-signin'));
    });
    expect(screen.getByTestId('signed').props.children).toBe('true');

    // depois desloga
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-signout'));
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    expect(screen.getByTestId('signed').props.children).toBe('false');
    expect(screen.getByTestId('user').props.children).toBe('null');
  });
});