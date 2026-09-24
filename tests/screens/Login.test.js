// tests/screens/Login.test.js
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Login from '../../src/screens/Login';

const mockSignIn = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

function renderLogin() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(<Login navigation={navigation} />);
  return { navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.mockResolvedValue(undefined);
});

describe('Login — validação de campos', () => {
  it('exibe alerta quando e-mail e senha estão vazios', () => {
    renderLogin();
    fireEvent.press(screen.getByTestId('btn-submit'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos.'
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('exibe alerta quando apenas o e-mail está preenchido', () => {
    renderLogin();
    fireEvent.changeText(screen.getByTestId('input-email'), 'a@b.com');
    fireEvent.press(screen.getByTestId('btn-submit'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos.'
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('exibe alerta quando apenas a senha está preenchida', () => {
    renderLogin();
    fireEvent.changeText(screen.getByTestId('input-password'), 'senha123');
    fireEvent.press(screen.getByTestId('btn-submit'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos.'
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('não considera válido quando só há espaços em branco', () => {
    renderLogin();
    fireEvent.changeText(screen.getByTestId('input-email'), '   ');
    fireEvent.changeText(screen.getByTestId('input-password'), '   ');
    fireEvent.press(screen.getByTestId('btn-submit'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos.'
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

describe('Login — submit com dados válidos', () => {
  it('chama signIn com e-mail e senha corretos', async () => {
    renderLogin();
    fireEvent.changeText(screen.getByTestId('input-email'), 'ana@test.com');
    fireEvent.changeText(screen.getByTestId('input-password'), 'senha123');
    fireEvent.press(screen.getByTestId('btn-submit'));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('ana@test.com', 'senha123');
    });
  });
});

describe('Login — tratamento de erro', () => {
  it('exibe alerta de erro quando signIn lança exceção', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('401'));
    renderLogin();
    fireEvent.changeText(screen.getByTestId('input-email'), 'ana@test.com');
    fireEvent.changeText(screen.getByTestId('input-password'), 'errada');
    fireEvent.press(screen.getByTestId('btn-submit'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro no login',
        'Verifique suas credenciais e tente novamente.'
      );
    });
  });
});

describe('Login — navegação', () => {
  it('navega para ForgotPassword ao clicar no link', () => {
    const { navigation } = renderLogin();
    fireEvent.press(screen.getByTestId('link-forgot'));
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navega para Register ao clicar no link de cadastro', () => {
    const { navigation } = renderLogin();
    fireEvent.press(screen.getByTestId('link-register'));
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
  });
});