// src/services/networkErrors.js
// T050 — Tratamento global de erros de rede/offline.
//
// Como funciona:
//   1. O interceptor do Axios (src/services/api.js) chama `classifyNetworkError`.
//      Só falhas SEM resposta do servidor contam (sem internet, servidor fora,
//      timeout). Erros HTTP (400/401/500...) continuam indo para a tela.
//   2. Se há um banner montado (<NetworkErrorBanner />), a requisição que falhou
//      entra numa fila e a Promise de quem chamou fica AGUARDANDO.
//   3. "Tentar novamente" refaz todas as requisições da fila — quem chamou recebe
//      a resposta normalmente, sem a tela precisar saber que houve falha.
//      "Fechar" rejeita todas com o erro original, e a tela mostra o próprio
//      estado de erro. Ou seja: a tela nunca trava nem derruba o app.

export const NETWORK_ERROR_KIND = {
  OFFLINE: "offline",
  TIMEOUT: "timeout",
};

export const NETWORK_ERROR_MESSAGES = {
  [NETWORK_ERROR_KIND.OFFLINE]: "Sem conexão com a internet. Verifique sua rede.",
  [NETWORK_ERROR_KIND.TIMEOUT]: "O servidor demorou para responder.",
};

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);
const OFFLINE_CODES = new Set(["ERR_NETWORK", "ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN"]);

// Devolve "offline" | "timeout" | null (null = não é falha de rede).
export function classifyNetworkError(error) {
  if (!error) return null;
  if (error.code === "ERR_CANCELED" || error.name === "CanceledError" || error.__CANCEL__) return null;
  if (error.response) return null; // o servidor respondeu: é erro de negócio, não de rede

  const message = String(error.message || "");
  if (TIMEOUT_CODES.has(error.code) || /timeout/i.test(message)) return NETWORK_ERROR_KIND.TIMEOUT;
  if (OFFLINE_CODES.has(error.code) || /network\s*error/i.test(message) || error.request) {
    return NETWORK_ERROR_KIND.OFFLINE;
  }
  return null;
}

export function isNetworkError(error) {
  return classifyNetworkError(error) !== null;
}

// Mensagem amigável e padronizada para qualquer erro de API.
export function getFriendlyErrorMessage(error, fallback = "Algo deu errado. Tente novamente.") {
  const kind = classifyNetworkError(error);
  if (kind) return NETWORK_ERROR_MESSAGES[kind];
  const data = error?.response?.data;
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// Fila de requisições que falharam por rede
// ---------------------------------------------------------------------------
let pending = [];
const listeners = new Set();

function snapshot() {
  if (pending.length === 0) return { visible: false, kind: null, count: 0 };
  // "offline" tem prioridade: é a causa mais provável quando há várias falhas.
  const kind = pending.some((p) => p.kind === NETWORK_ERROR_KIND.OFFLINE)
    ? NETWORK_ERROR_KIND.OFFLINE
    : NETWORK_ERROR_KIND.TIMEOUT;
  return { visible: true, kind, count: pending.length, message: NETWORK_ERROR_MESSAGES[kind] };
}

function notify() {
  const state = snapshot();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error("Erro no listener de rede:", error);
    }
  });
}

export function subscribeNetworkErrors(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

// Sem banner montado (ex.: testes, antes do App montar) não faz sentido
// segurar a requisição: ninguém veria o aviso nem poderia tentar de novo.
export function hasNetworkErrorHandler() {
  return listeners.size > 0;
}

export function getNetworkErrorState() {
  return snapshot();
}

export function enqueueFailedRequest({ kind, error, retry }) {
  return new Promise((resolve, reject) => {
    pending.push({ kind, error, retry, resolve, reject });
    notify();
  });
}

// "Tentar novamente": refaz tudo. Se falhar de novo por rede, o interceptor
// coloca a requisição na fila outra vez e o banner reaparece.
export function retryFailedRequests() {
  const batch = pending;
  pending = [];
  notify();
  batch.forEach((item) => {
    Promise.resolve()
      .then(() => item.retry())
      .then(item.resolve, item.reject);
  });
  return batch.length;
}

// "Fechar": desiste e devolve o erro original para cada tela tratar.
export function dismissFailedRequests() {
  const batch = pending;
  pending = [];
  notify();
  batch.forEach((item) => item.reject(item.error));
  return batch.length;
}

// Apenas para testes.
export function __resetNetworkErrorsForTests() {
  pending = [];
  listeners.clear();
}
