// tests/services/inAppNotifications.test.js — Front-1 (fila do banner in-app)
import {
  __resetInAppForTests,
  hasInAppHandler,
  showInAppNotification,
  subscribeInApp,
} from "../../src/services/inAppNotifications";

beforeEach(() => __resetInAppForTests());

describe("inAppNotifications", () => {
  it("começa sem handler montado (nada aparece sem evento)", () => {
    expect(hasInAppHandler()).toBe(false);
  });

  it("entrega a notificação aos assinantes e gera um id", () => {
    const seen = [];
    subscribeInApp((n) => seen.push(n));
    const id = showInAppNotification({ type: "message", name: "Ana", message: "Oi" });

    expect(hasInAppHandler()).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ type: "message", name: "Ana", message: "Oi" });
    expect(seen[0].id).toBe(id);
    expect(typeof id).toBe("string");
  });

  it("ids são únicos entre notificações", () => {
    subscribeInApp(() => {});
    const a = showInAppNotification({ name: "A" });
    const b = showInAppNotification({ name: "B" });
    expect(a).not.toBe(b);
  });

  it("ignora notificação nula", () => {
    const seen = [];
    subscribeInApp((n) => seen.push(n));
    expect(showInAppNotification(null)).toBeNull();
    expect(seen).toHaveLength(0);
  });

  it("cancelar a assinatura remove o handler", () => {
    const unsub = subscribeInApp(() => {});
    expect(hasInAppHandler()).toBe(true);
    unsub();
    expect(hasInAppHandler()).toBe(false);
  });

  it("um listener que lança não derruba os outros", () => {
    const ok = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
    subscribeInApp(() => {
      throw new Error("boom");
    });
    subscribeInApp(ok);
    showInAppNotification({ name: "A" });
    expect(ok).toHaveBeenCalledTimes(1);
    console.error.mockRestore();
  });
});
