// tests/screens/Settings.test.js
// T025 — tela de Configurações: agrupamento das ações de conta,
// preferência de notificações, modal de alterar senha e logout (signOut).

// ⚠️ mockSignOut definido FORA do jest.mock e reaproveitado dentro dele
const mockSignOut = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    signed: true,
    user: { id: 1, name: 'Ana' },
  }),
}));

import React from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '../../src/components';
import Settings from '../../src/screens/Settings';

function renderSettings() {
  render(
    <ToastProvider>
      <Settings navigation={{ navigate: mockNavigate, goBack: jest.fn() }} />
    </ToastProvider>
  );
}

// Pressiona um elemento pelo testID (fireEvent.press encontra o onPress
// subindo a árvore — o RN 0.86 não deixa o handler no elemento host).
async function pressButton(testID) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

// Preenche um campo do modal de alterar senha.
async function fillInput(testID, value) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), value);
  });
}

// Retorna a última chamada registrada de Alert.alert.
function lastAlert() {
  const calls = Alert.alert.mock.calls;
  return calls[calls.length - 1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
  // SecureStore.getItemAsync começa sem preferência salva (padrão: ativadas).
  SecureStore.getItemAsync.mockResolvedValue(undefined);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
});

describe('Settings — agrupamento das ações de conta', () => {
  it('exibe os grupos e todos os itens de conta na mesma tela', () => {
    renderSettings();

    expect(screen.getByText('Configurações')).toBeTruthy();
    expect(screen.getByText('PREFERÊNCIAS')).toBeTruthy();
    expect(screen.getByText('CONTA')).toBeTruthy();
    expect(screen.getByText('SESSÃO')).toBeTruthy();

    expect(screen.getByText('Notificações')).toBeTruthy();
    expect(screen.getByText('Alterar senha')).toBeTruthy();
    expect(screen.getByText('Verificação de foto')).toBeTruthy();
    expect(screen.getByText('Meus dados (LGPD)')).toBeTruthy();
    expect(screen.getByTestId('btn-signout')).toBeTruthy();
  });
});

describe('Settings — notificações', () => {
  it('inicia ativadas quando não há preferência salva', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByTestId('switch-notifications').props.value).toBe(true);
    });
  });

  it('carrega a preferência salva no SecureStore', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('false');
    renderSettings();
    await waitFor(() => {
      expect(screen.getByTestId('switch-notifications').props.value).toBe(false);
    });
  });

  it('persiste o novo valor no SecureStore ao alternar o Switch', async () => {
    renderSettings();

    await act(async () => {
      fireEvent(screen.getByTestId('switch-notifications'), 'valueChange', false);
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'notifications_enabled',
      'false'
    );
    await waitFor(() => {
      expect(screen.getByTestId('switch-notifications').props.value).toBe(false);
    });
  });
});

describe('Settings — alterar senha (modal)', () => {
  it('abre o modal ao tocar em "Alterar senha"', async () => {
    renderSettings();
    await pressButton('btn-change-password');

    expect(screen.getByTestId('input-current-password')).toBeTruthy();
    expect(screen.getByTestId('input-new-password')).toBeTruthy();
    expect(screen.getByTestId('input-confirm-password')).toBeTruthy();
    expect(screen.getByText('Alterar Senha')).toBeTruthy();
  });

  it('exibe alerta quando os campos estão vazios', async () => {
    renderSettings();
    await pressButton('btn-change-password');
    await pressButton('btn-submit-password');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos.'
    );
  });

  it('exibe alerta quando a confirmação não bate com a nova senha', async () => {
    renderSettings();
    await pressButton('btn-change-password');
    await fillInput('input-current-password', 'senha123');
    await fillInput('input-new-password', 'nova123');
    await fillInput('input-confirm-password', 'outra123');
    await pressButton('btn-submit-password');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Erro',
      'As senhas não coincidem. Verifique e tente novamente.'
    );
  });

  it('exibe alerta quando a nova senha tem menos de 6 caracteres', async () => {
    renderSettings();
    await pressButton('btn-change-password');
    await fillInput('input-current-password', 'senha123');
    await fillInput('input-new-password', 'abc');
    await fillInput('input-confirm-password', 'abc');
    await pressButton('btn-submit-password');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'A nova senha deve ter pelo menos 6 caracteres.'
    );
  });

  it('valida os campos e informa que a rota da API chega em breve (TODO backend)', async () => {
    renderSettings();
    await pressButton('btn-change-password');
    await fillInput('input-current-password', 'senha123');
    await fillInput('input-new-password', 'nova123');
    await fillInput('input-confirm-password', 'nova123');
    await pressButton('btn-submit-password');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Em breve',
      'A alteração de senha estará disponível em breve.'
    );
    // Modal fecha depois do envio
    await waitFor(() => {
      expect(screen.queryByTestId('input-current-password')).toBeNull();
    });
  });

  it('fecha o modal sem alterar nada ao cancelar', async () => {
    renderSettings();
    await pressButton('btn-change-password');
    await fillInput('input-current-password', 'senha123');
    await pressButton('btn-cancel-password');

    expect(Alert.alert).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('input-current-password')).toBeNull();
    });
  });
});

describe('Settings — sair (logout via AuthContext)', () => {
  it('pede confirmação antes de sair', async () => {
    renderSettings();
    await pressButton('btn-signout');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sair',
      'Deseja realmente sair da conta?',
      expect.any(Array)
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('chama signOut do AuthContext ao confirmar', async () => {
    renderSettings();
    await pressButton('btn-signout');

    const [, , buttons] = lastAlert();
    const confirm = buttons.find((button) => button.text === 'Sair');

    await act(async () => {
      await confirm.onPress();
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('não chama signOut ao cancelar', async () => {
    renderSettings();
    await pressButton('btn-signout');

    const [, , buttons] = lastAlert();
    const cancel = buttons.find((button) => button.text === 'Cancelar');

    // O botão "Cancelar" só fecha o Alert (sem callback) — signOut não roda.
    expect(cancel).toBeTruthy();
    expect(cancel.style).toBe('cancel');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('Settings — demais ações de conta', () => {
  it('navega para a tela de selfie na verificação de foto (T023)', async () => {
    renderSettings();
    await pressButton('btn-photo-verification');

    expect(mockNavigate).toHaveBeenCalledWith('PhotoVerification');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('mostra feedback de "em breve" em meus dados / LGPD (T024)', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');

    expect(
      screen.getByText('Em breve: exclusão de conta e portabilidade de dados.')
    ).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});


