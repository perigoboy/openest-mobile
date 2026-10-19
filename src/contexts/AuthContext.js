import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext({});

// Mock de desenvolvimento (FRONT-ONLY, sem backend).
// Permite acessar todas as telas pelo fluxo normal de Login com:
// usuário: "admin" (ou "admin@openest.local") + senha: "123".
// Nenhuma rota foi removida/alterada — só um atalho antes da chamada real à API.
const MOCK_CREDENTIALS = {
  username: 'admin',
  email: 'admin@openest.local',
  password: '123',
};

const MOCK_USER = {
  id: 'mock-admin-id',
  name: 'Admin (mock)',
  username: 'admin',
  email: 'admin@openest.local',
  foto_url: '',
  verificado: true,
};

const MOCK_TOKEN = 'mock-token-admin-123';

function isMockCredentials(email, password) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const normalizedPassword = String(password || '').trim();
  return (
    normalizedPassword === MOCK_CREDENTIALS.password &&
    (normalizedEmail === MOCK_CREDENTIALS.username ||
      normalizedEmail === MOCK_CREDENTIALS.email)
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verifica se já existe um token salvo ao iniciar o app
  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await SecureStore.getItemAsync('user_token');
        const storedUser = await SecureStore.getItemAsync('user_data');

        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Erro ao carregar dados de autenticação', error);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  // Função de Login
  async function signIn(email, password) {
    // Atalho FRONT-ONLY: admin/123 entra sem backend para liberar as telas.
    if (isMockCredentials(email, password)) {
      await SecureStore.setItemAsync('user_token', MOCK_TOKEN);
      await SecureStore.setItemAsync('user_data', JSON.stringify(MOCK_USER));
      setUser(MOCK_USER);
      return;
    }

    try {
      // T011: rota real do backend é POST /api/users/login (ver server.js:
      // app.use("/api/users", userRoutes) + userRoutes.js: router.post('/login', ...))
      const response = await api.post('/api/users/login', { email, password });

      const { token, user: userData } = response.data;

      // Salva de forma segura no SecureStore
      await SecureStore.setItemAsync('user_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(userData));

      setUser(userData);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  // Função de Cadastro (T012)
  async function signUp(name, email, password, statusRelacionamento) {
    try {
      // Rota real: POST /api/users/register (server.js: app.use("/api/users", userRoutes)).
      // O backend hoje só lê name/email/password (ver userController.js) — status_relacionamento
      // é enviado para já deixar o cliente pronto, mas ainda não é persistido pela API.
      const response = await api.post('/api/users/register', {
        name,
        email,
        password,
        status_relacionamento: statusRelacionamento,
      });

      const { token, user: userData } = response.data;

      // Auto-login: reaproveita o mesmo mecanismo do signIn, sem precisar
      // de uma segunda chamada de rede para /login.
      await SecureStore.setItemAsync('user_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(userData));

      setUser(userData);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
  }

  // Função de Logout
  async function signOut() {
    try {
      await SecureStore.deleteItemAsync('user_token');
      await SecureStore.deleteItemAsync('user_data');
      setUser(null);
    } catch (error) {
      console.error('Erro ao sair da conta', error);
    }
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}