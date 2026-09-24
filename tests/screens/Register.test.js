// tests/screens/Register.test.js

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mocked = React.forwardRef((props, ref) => {
    const { children, onPress, disabled, testID, style, accessibilityRole } = props;
    return React.createElement(
      View,
      {
        ref,
        testID,
        accessibilityRole: accessibilityRole || 'button',
        accessibilityState: { disabled: !!disabled },
        style,
        onPress: disabled ? undefined : onPress,
      },
      children
    );
  });
  Mocked.displayName = 'TouchableOpacity';
  return {
    __esModule: true,
    default: Mocked,
    TouchableOpacity: Mocked,
  };
});

// ⚠️ mockSignUp definido FORA do jest.mock e reaproveitado dentro dele
const mockSignUp = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import Register from '../../src/screens/Register';

function renderRegister() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  render(<Register navigation={navigation} />);
  return { navigation };
}

async function fillValidForm(overrides = {}) {
  const data = {
    name: 'Ana Silva',
    email: 'ana@test.com',
    password: 'senha123',
    ...overrides,
  };
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('input-name'), data.name);
    fireEvent.changeText(screen.getByTestId('input-email'), data.email);
    fireEvent.changeText(screen.getByTestId('input-password'), data.password);
  });
}

async function pressButton(testID) {
  const el = screen.getByTestId(testID);
  await act(async () => {
    if (typeof el.props.onPress === 'function') {
      await el.props.onPress();
    }
  });
}

beforeEach(() => {
  mockSignUp.mockReset();
  mockSignUp.mockResolvedValue(undefined);
  Alert.alert.mockClear();
});

describe('Register — validação de campos obrigatórios', () => {
  it('exibe alerta quando todos os campos estão vazios', async () => {
    renderRegister();
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos obrigatórios.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('exibe alerta quando só o nome está vazio', async () => {
    renderRegister();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-email'), 'ana@test.com');
      fireEvent.changeText(screen.getByTestId('input-password'), 'senha123');
    });
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos obrigatórios.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('exibe alerta quando só o e-mail está vazio', async () => {
    renderRegister();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-name'), 'Ana Silva');
      fireEvent.changeText(screen.getByTestId('input-password'), 'senha123');
    });
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos obrigatórios.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('exibe alerta quando só a senha está vazia', async () => {
    renderRegister();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-name'), 'Ana Silva');
      fireEvent.changeText(screen.getByTestId('input-email'), 'ana@test.com');
    });
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos obrigatórios.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('não considera válido quando só há espaços em branco', async () => {
    renderRegister();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('input-name'), '   ');
      fireEvent.changeText(screen.getByTestId('input-email'), '   ');
      fireEvent.changeText(screen.getByTestId('input-password'), '   ');
    });
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, preencha todos os campos obrigatórios.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe('Register — validação de senha mínima', () => {
  it('exibe alerta quando a senha tem menos de 6 caracteres', async () => {
    renderRegister();
    await fillValidForm({ password: 'abc' });
    await pressButton('checkbox-terms');
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      'A senha precisa ter no mínimo 6 caracteres.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('aceita senha com exatamente 6 caracteres', async () => {
    renderRegister();
    await fillValidForm({ password: 'abc123' });
    await pressButton('checkbox-terms');
    await pressButton('btn-submit');
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
  });
});

describe('Register — consentimento LGPD', () => {
  it('exibe alerta quando os termos NÃO foram aceitos', async () => {
    renderRegister();
    await fillValidForm();
    await pressButton('btn-submit');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Consentimento Obrigatório',
      'Você precisa aceitar os Termos de Uso e a Política de Privacidade para prosseguir.'
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('exibe o texto dos Termos ao clicar no link', async () => {
    renderRegister();
    await pressButton('link-terms');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Termos de Uso e Política de Privacidade',
      expect.stringContaining('LGPD')
    );
  });
});

describe('Register — submit com dados válidos', () => {
  it('chama signUp com nome, email, senha e status', async () => {
    renderRegister();
    await fillValidForm();
    await pressButton('checkbox-terms');
    await pressButton('btn-submit');
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'Ana Silva',
        'ana@test.com',
        'senha123',
        'solteiro'
      );
    });
  });
});

describe('Register — tratamento de erro do backend', () => {
  it('exibe mensagem específica do backend quando disponível', async () => {
    const backendError = new Error('E-mail já cadastrado');
    backendError.response = { data: { error: 'E-mail já cadastrado' } };
    mockSignUp.mockRejectedValueOnce(backendError);

    renderRegister();
    await fillValidForm();
    await pressButton('checkbox-terms');
    await pressButton('btn-submit');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro no cadastro',
        'E-mail já cadastrado'
      );
    });
  });

  it('exibe mensagem genérica quando backend não manda mensagem', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('Network error'));

    renderRegister();
    await fillValidForm();
    await pressButton('checkbox-terms');
    await pressButton('btn-submit');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro no cadastro',
        'Não foi possível realizar o cadastro. Tente novamente.'
      );
    });
  });
});

describe('Register — estado de submitting', () => {
  it('mostra "Cadastrando..." durante o submit', async () => {
    let resolveSignUp;
    mockSignUp.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSignUp = resolve; })
    );

    renderRegister();
    await fillValidForm();
    await pressButton('checkbox-terms');

    // ⚠️ Não faz await no pressButton aqui — dispara e segue
    const btn = screen.getByTestId('btn-submit');
    act(() => {
      btn.props.onPress();
    });

    await waitFor(() => {
      expect(screen.getByText('Cadastrando...')).toBeTruthy();
    });

    await act(async () => {
      resolveSignUp();
    });

    await waitFor(() => {
      expect(screen.getByText('Cadastrar')).toBeTruthy();
    });
  });
});

describe('Register — navegação', () => {
  it('chama navigation.goBack ao clicar em "Já tem uma conta?"', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    render(<Register navigation={navigation} />);

    const el = screen.getByTestId('link-login');
    await act(async () => {
      if (typeof el.props.onPress === 'function') {
        await el.props.onPress();
      }
    });

    expect(navigation.goBack).toHaveBeenCalled();
  });
});