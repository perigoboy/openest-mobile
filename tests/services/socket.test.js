// tests/services/socket.test.js — T045 (conexão Socket.IO com JWT)
import { io } from "socket.io-client";

jest.mock("socket.io-client", () => {
  const createFake = () => {
    const fake = {
      connected: false,
      active: false,
      auth: undefined,
      connect: jest.fn(() => {
        fake.connected = true;
        fake.active = true;
      }),
      disconnect: jest.fn(() => {
        fake.connected = false;
        fake.active = false;
      }),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      timeout: jest.fn(() => ({ emit: fake.timedEmit })),
      timedEmit: jest.fn(),
    };
    return fake;
  };
  return { io: jest.fn(() => createFake()) };
});

const ORIGINAL_URL = process.env.EXPO_PUBLIC_API_URL;

function loadSocketModule() {
  let mod;
  jest.isolateModules(() => {
    mod = require("../../src/services/socket");
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = "http://192.168.0.10:3000";
});

afterAll(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL_URL;
});

describe("socket service", () => {
  it("cria a conexão com a URL da API, só WebSocket e sem conectar sozinho", () => {
    const socket = loadSocketModule();
    socket.getSocket();

    expect(io).toHaveBeenCalledWith(
      "http://192.168.0.10:3000",
      expect.objectContaining({ autoConnect: false, transports: ["websocket"], reconnection: true })
    );
  });

  it("reaproveita a mesma instância (singleton)", () => {
    const socket = loadSocketModule();
    expect(socket.getSocket()).toBe(socket.getSocket());
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("conecta passando o JWT em auth.token (exigido pelo servidor)", () => {
    const socket = loadSocketModule();
    const instance = socket.connectSocket("jwt-123");

    expect(instance.auth).toEqual({ token: "jwt-123" });
    expect(instance.connect).toHaveBeenCalledTimes(1);
    expect(socket.isSocketConnected()).toBe(true);
  });

  it("não reconecta à toa com o mesmo token, mas reconecta ao trocar de conta", () => {
    const socket = loadSocketModule();
    const instance = socket.connectSocket("jwt-1");
    socket.connectSocket("jwt-1");
    expect(instance.connect).toHaveBeenCalledTimes(1);

    socket.connectSocket("jwt-2");
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
    expect(instance.connect).toHaveBeenCalledTimes(2);
    expect(instance.auth).toEqual({ token: "jwt-2" });
  });

  it("sem token não conecta", () => {
    const socket = loadSocketModule();
    expect(socket.connectSocket(null)).toBeNull();
    expect(io).not.toHaveBeenCalled();
  });

  it("sem EXPO_PUBLIC_API_URL desativa o tempo real sem quebrar o app", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const socket = loadSocketModule();

    expect(socket.getSocket()).toBeNull();
    expect(socket.connectSocket("jwt")).toBeNull();
    expect(socket.onSocketEvent("new_message", () => {})).toEqual(expect.any(Function));
    expect(socket.joinConversation(1)).toBe(false);
    warn.mockRestore();
  });

  it("disconnectSocket limpa o token e desconecta (logout)", () => {
    const socket = loadSocketModule();
    const instance = socket.connectSocket("jwt");
    socket.disconnectSocket();

    expect(instance.disconnect).toHaveBeenCalled();
    expect(instance.auth).toEqual({});
    expect(socket.isSocketConnected()).toBe(false);
  });

  it("onSocketEvent devolve a função que remove o listener", () => {
    const socket = loadSocketModule();
    const handler = jest.fn();
    const off = socket.onSocketEvent("new_match", handler);
    const instance = socket.getSocket();

    expect(instance.on).toHaveBeenCalledWith("new_match", handler);
    off();
    expect(instance.off).toHaveBeenCalledWith("new_match", handler);
  });

  it("join/leave só emitem com o socket conectado", () => {
    const socket = loadSocketModule();
    expect(socket.joinConversation(10)).toBe(false);

    const instance = socket.connectSocket("jwt");
    expect(socket.joinConversation(10)).toBe(true);
    expect(socket.leaveConversation(10)).toBe(true);
    expect(instance.emit).toHaveBeenCalledWith("join_conversation", 10);
    expect(instance.emit).toHaveBeenCalledWith("leave_conversation", 10);
  });

  describe("emitWithAck", () => {
    it("rejeita se o socket estiver desconectado", async () => {
      const socket = loadSocketModule();
      socket.getSocket();
      await expect(socket.emitWithAck("send_message", {})).rejects.toThrow("SOCKET_DISCONNECTED");
    });

    it("resolve com a resposta do servidor", async () => {
      const socket = loadSocketModule();
      const instance = socket.connectSocket("jwt");
      instance.timedEmit.mockImplementation((event, payload, cb) => cb(null, { ok: true, message: { id: 1 } }));

      await expect(socket.emitWithAck("send_message", { content: "oi" }, 5000)).resolves.toEqual({
        ok: true,
        message: { id: 1 },
      });
      expect(instance.timeout).toHaveBeenCalledWith(5000);
    });

    it("rejeita quando o servidor não confirma a tempo", async () => {
      const socket = loadSocketModule();
      const instance = socket.connectSocket("jwt");
      instance.timedEmit.mockImplementation((event, payload, cb) => cb(new Error("operation has timed out")));

      await expect(socket.emitWithAck("send_message", {})).rejects.toThrow("timed out");
    });
  });
});
