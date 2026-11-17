import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  classifyNetworkError,
  enqueueFailedRequest,
  hasNetworkErrorHandler,
} from './networkErrors';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição para injetar o Token JWT automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao recuperar o token do SecureStore', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// T050 — Interceptor global de falhas de rede/timeout.
// Marca o erro (error.networkErrorKind) e, se o <NetworkErrorBanner /> estiver
// montado, segura a requisição até o usuário tocar em "Tentar novamente"
// (refaz a chamada) ou fechar o aviso (rejeita com o erro original).
// Requisições de segundo plano podem pular o banner com
// `{ skipGlobalErrorHandler: true }` no config do axios.
export function handleResponseError(error) {
  const kind = classifyNetworkError(error);
  if (kind && error && typeof error === 'object') {
    error.networkErrorKind = kind;
  }

  const config = error?.config;
  if (!kind || !config || config.skipGlobalErrorHandler || !hasNetworkErrorHandler()) {
    return Promise.reject(error);
  }

  return enqueueFailedRequest({
    kind,
    error,
    retry: () => api.request(config),
  });
}

api.interceptors.response.use((response) => response, handleResponseError);

export default api;
