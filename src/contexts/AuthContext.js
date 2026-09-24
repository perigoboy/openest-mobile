import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext({});

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
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut }}>
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