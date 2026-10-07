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

// ---------------------------------------------------------------
// T024 — mocks da API LGPD (exportação e exclusão de conta)
// ---------------------------------------------------------------
const mockApiGet = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApiGet(...args),
    delete: (...args) => mockApiDelete(...args),
  },
}));

// T024 — expo-file-system grava o JSON e expo-sharing abre a folha do sistema.
const mockFileCreate = jest.fn();
const mockFileWrite = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();

jest.mock('expo-file-system', () => {
  class File {
    constructor() {
      this.uri = 'file:///cache/dados_openest.json';
    }
    create(...args) {
      return mockFileCreate(...args);
    }
    write(...args) {
      return mockFileWrite(...args);
    }
  }
  return { File, Paths: { cache: 'file:///cache' } };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args) => mockIsAvailableAsync(...args),
  shareAsync: (...args) => mockShareAsync(...args),
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
  // T024 — padrões de sucesso das rotas LGPD.
  mockApiGet.mockResolvedValue({
    data: { perfil: { name: 'Ana', email: 'ana@openest.com' }, matches: [], mensagens: [] },
  });
  mockApiDelete.mockResolvedValue({
    data: { message: 'Sua conta foi excluída e seus dados anonimizados com sucesso.' },
  });
  mockIsAvailableAsync.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
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

describe('Settings — meus dados (LGPD) (T024)', () => {
  it('abre o modal de portabilidade/exclusão ao tocar em "Meus dados"', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');

    // Modal aberto: as duas ações da LGPD ficam disponíveis.
    expect(screen.getByTestId('btn-download-data')).toBeTruthy();
    expect(screen.getByTestId('btn-delete-account')).toBeTruthy();
    expect(screen.getByTestId('btn-cancel-privacy')).toBeTruthy();
    // O título existe no menu e no modal (navegação + cabeçalho).
    expect(screen.getAllByText('Meus dados (LGPD)').length).toBeGreaterThanOrEqual(2);
  });

  it('"Baixar meus dados" dispara GET na rota de exportação e compartilha o JSON', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-download-data');

    // Critério de aceite: GET para a rota de exportação.
    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/api/users/exportar-dados')
    );
    expect(mockFileCreate).toHaveBeenCalled();
    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"perfil"'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockShareAsync.mock.calls[0][0]).toBe('file:///cache/dados_openest.json');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('mostra o erro da API quando a exportação falha', async () => {
    mockApiGet.mockRejectedValue({ response: { data: { error: 'Exportação indisponível.' } } });

    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-download-data');

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Exportação indisponível.')
    );
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('"Excluir conta" pede confirmação antes de qualquer ação', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-delete-account');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Excluir conta',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('não exclui a conta ao cancelar a confirmação', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-delete-account');

    const [, , buttons] = lastAlert();
    const cancel = buttons.find((button) => button.text === 'Cancelar');
    expect(cancel).toBeTruthy();
    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('exclui a conta (DELETE) e limpa a sessão ao confirmar — irrevogável', async () => {
    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-delete-account');

    const [, , buttons] = lastAlert();
    const confirm = buttons.find((button) => button.text === 'Excluir');
    await act(async () => {
      await confirm.onPress();
    });

    // Critério de aceite: exclusão disparada e sessão limpa no clique.
    await waitFor(() => expect(mockApiDelete).toHaveBeenCalledWith('/api/users/conta'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Conta excluída',
      'Sua conta foi excluída e seus dados anonimizados com sucesso.'
    );
  });

  it('mantém a sessão quando a API recusa a exclusão', async () => {
    mockApiDelete.mockRejectedValue({ response: { data: { error: 'Sem conexão.' } } });

    renderSettings();
    await pressButton('btn-data-privacy');
    await pressButton('btn-delete-account');

    const [, , buttons] = lastAlert();
    const confirm = buttons.find((button) => button.text === 'Excluir');
    await act(async () => {
      await confirm.onPress();
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Sem conexão.'));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('Settings — verificação de foto (T023)', () => {
  it('navega para a tela de selfie na verificação de foto (T023)', async () => {
    renderSettings();
    await pressButton('btn-photo-verification');

    expect(mockNavigate).toHaveBeenCalledWith('PhotoVerification');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});


