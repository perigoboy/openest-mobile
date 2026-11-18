// tests/services/networkErrors.test.js
// T050 — tratamento global de erros de rede/offline.
// A parte de integração usa o `api` REAL (axios + interceptors) com um
// adapter falso que simula a rede caindo e voltando.
import { AxiosError } from "axios";
import api from "../../src/services/api";
import {
  NETWORK_ERROR_KIND,
  __resetNetworkErrorsForTests,
  classifyNetworkError,
  dismissFailedRequests,
  getFriendlyErrorMessage,
  getNetworkErrorState,
  isNetworkError,
  retryFailedRequests,
  subscribeNetworkErrors,
} from "../../src/services/networkErrors";

const offlineError = (config = {}) => new AxiosError("Network Error", "ERR_NETWORK", config, {});
const timeoutError = (config = {}) =>
  new AxiosError("timeout of 10000ms exceeded", "ECONNABORTED", config, {});
const httpError = (status, data, config = {}) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, {}, {
    status,
    data,
    headers: {},
    config,
    statusText: "",
  });

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("classifyNetworkError", () => {
  it("reconhece sem internet e timeout", () => {
    expect(classifyNetworkError(offlineError())).toBe(NETWORK_ERROR_KIND.OFFLINE);
    expect(classifyNetworkError(timeoutError())).toBe(NETWORK_ERROR_KIND.TIMEOUT);
    expect(classifyNetworkError({ message: "Network Error" })).toBe(NETWORK_ERROR_KIND.OFFLINE);
  });

  it("erro HTTP (servidor respondeu) NÃO é erro de rede", () => {
    expect(classifyNetworkError(httpError(500, {}))).toBeNull();
    expect(classifyNetworkError(httpError(401, {}))).toBeNull();
    expect(isNetworkError(httpError(404, {}))).toBe(false);
  });

  it("cancelamento e erros comuns de JS não contam", () => {
    expect(classifyNetworkError(new AxiosError("canceled", "ERR_CANCELED"))).toBeNull();
    expect(classifyNetworkError(new TypeError("x is undefined"))).toBeNull();
    expect(classifyNetworkError(null)).toBeNull();
  });
});

describe("getFriendlyErrorMessage", () => {
  it("mensagens padronizadas para rede", () => {
    expect(getFriendlyErrorMessage(offlineError())).toBe("Sem conexão com a internet. Verifique sua rede.");
    expect(getFriendlyErrorMessage(timeoutError())).toBe("O servidor demorou para responder.");
  });

  it("usa a mensagem do backend quando houver", () => {
    expect(getFriendlyErrorMessage(httpError(400, { error: "E-mail inválido" }))).toBe("E-mail inválido");
    expect(getFriendlyErrorMessage(httpError(404, { message: "Conversa não encontrada" }))).toBe("Conversa não encontrada");
  });

  it("cai no fallback quando não há o que mostrar", () => {
    expect(getFriendlyErrorMessage(httpError(500, {}), "Falhou")).toBe("Falhou");
  });
});

describe("api + interceptor global (integração com axios)", () => {
  let originalAdapter;
  let calls;

  beforeEach(() => {
    __resetNetworkErrorsForTests();
    originalAdapter = api.defaults.adapter;
    calls = 0;
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    __resetNetworkErrorsForTests();
  });

  // Primeira chamada falha por rede; as seguintes funcionam.
  function networkFailsOnce(errorFactory = offlineError) {
    api.defaults.adapter = async (config) => {
      calls += 1;
      if (calls === 1) throw errorFactory(config);
      return { data: { ok: true, calls }, status: 200, statusText: "OK", headers: {}, config };
    };
  }

  it("sem banner montado, rejeita na hora (comportamento antigo preservado)", async () => {
    networkFailsOnce();
    await expect(api.get("/api/conversas")).rejects.toMatchObject({ networkErrorKind: "offline" });
    expect(calls).toBe(1);
  });

  it("com banner montado, segura a requisição e mostra o aviso", async () => {
    networkFailsOnce();
    const states = [];
    subscribeNetworkErrors((s) => states.push(s));

    const pending = api.get("/api/conversas");
    await flush();

    expect(getNetworkErrorState()).toMatchObject({ visible: true, kind: "offline", count: 1 });
    expect(states.at(-1).message).toBe("Sem conexão com a internet. Verifique sua rede.");

    retryFailedRequests();
    await expect(pending).resolves.toMatchObject({ data: { ok: true, calls: 2 } });
    expect(getNetworkErrorState().visible).toBe(false);
  });

  it("'Fechar' devolve o erro original para a tela tratar", async () => {
    networkFailsOnce(timeoutError);
    subscribeNetworkErrors(() => {});

    const pending = api.get("/api/conversas");
    await flush();
    expect(getNetworkErrorState().kind).toBe("timeout");

    dismissFailedRequests();
    await expect(pending).rejects.toMatchObject({ code: "ECONNABORTED", networkErrorKind: "timeout" });
  });

  it("se falhar de novo ao tentar novamente, o aviso volta", async () => {
    api.defaults.adapter = async (config) => {
      calls += 1;
      if (calls <= 2) throw offlineError(config);
      return { data: "ok", status: 200, statusText: "OK", headers: {}, config };
    };
    subscribeNetworkErrors(() => {});

    const pending = api.get("/x");
    await flush();
    retryFailedRequests();
    await flush();
    expect(getNetworkErrorState().visible).toBe(true);

    retryFailedRequests();
    await expect(pending).resolves.toMatchObject({ data: "ok" });
    expect(calls).toBe(3);
  });

  it("'Tentar novamente' refaz TODAS as requisições que falharam juntas", async () => {
    let online = false;
    api.defaults.adapter = async (config) => {
      if (!online) throw offlineError(config);
      return { data: config.url, status: 200, statusText: "OK", headers: {}, config };
    };
    subscribeNetworkErrors(() => {});

    const a = api.get("/a");
    const b = api.get("/b");
    await flush();
    expect(getNetworkErrorState().count).toBe(2);

    online = true;
    retryFailedRequests();
    await expect(Promise.all([a, b])).resolves.toEqual([
      expect.objectContaining({ data: "/a" }),
      expect.objectContaining({ data: "/b" }),
    ]);
  });

  it("erros HTTP passam direto para a tela (sem banner)", async () => {
    api.defaults.adapter = async (config) => {
      throw httpError(401, { error: "Token inválido" }, config);
    };
    subscribeNetworkErrors(() => {});

    await expect(api.get("/x")).rejects.toMatchObject({ response: { status: 401 } });
    expect(getNetworkErrorState().visible).toBe(false);
  });

  it("requisições de segundo plano podem pular o banner", async () => {
    networkFailsOnce();
    subscribeNetworkErrors(() => {});

    await expect(api.post("/api/users/push-token", {}, { skipGlobalErrorHandler: true })).rejects.toMatchObject({
      networkErrorKind: "offline",
    });
    expect(getNetworkErrorState().visible).toBe(false);
  });

  it("continua enviando o JWT ao refazer a requisição", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.getItemAsync.mockResolvedValue("jwt-abc");
    const seen = [];
    api.defaults.adapter = async (config) => {
      seen.push(config.headers.Authorization);
      if (seen.length === 1) throw offlineError(config);
      return { data: null, status: 200, statusText: "OK", headers: {}, config };
    };
    subscribeNetworkErrors(() => {});

    const pending = api.get("/x");
    await flush();
    retryFailedRequests();
    await pending;

    expect(seen).toEqual(["Bearer jwt-abc", "Bearer jwt-abc"]);
    SecureStore.getItemAsync.mockReset();
  });
});
