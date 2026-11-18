// tests/services/match.test.js — Front-3 (Encontros: endpoint + normalização)
import api from "../../src/services/api";
import { cancelEncontro, dedupeEncontros, fetchMatches, formatEncontroDate, googleCalendarUrl, normalizeEncontro } from "../../src/services/match";

jest.mock("../../src/services/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn() },
}));

const ORIGINAL = process.env.EXPO_PUBLIC_API_URL;
beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = "http://192.168.1.4:3000";
});
afterAll(() => {
  process.env.EXPO_PUBLIC_API_URL = ORIGINAL;
});
beforeEach(() => jest.clearAllMocks());

describe("fetchMatches", () => {
  it("usa a rota REAL de encontros (não a /api/matches inexistente)", async () => {
    api.get.mockResolvedValue({ data: [] });
    await fetchMatches();
    expect(api.get).toHaveBeenCalledWith("/api/events/meus-encontros");
  });

  it("normaliza matches e encontros agendados para a tela", async () => {
    api.get.mockResolvedValue({
      data: [
        { id: "match-abc", tipo: "match", matchName: "Regis", matchId: 8, local: "A combinar via chat",
          fotos: ["https://res.cloudinary.com/x/regis.jpg"] },
        { id: "sched-3", tipo: "agendado", titulo: "Café", matchName: "Ana", matchId: 5, local: "Café Centro", fotos: [] },
      ],
    });
    const list = await fetchMatches();
    expect(list[0]).toMatchObject({
      id: "match-abc", rawId: "abc", tipo: "match", name: "Regis",
      photo: "https://res.cloudinary.com/x/regis.jpg", conversationId: 8,
      status: "A combinar", dateTime: null, googleUrl: null,
    });
    expect(list[1]).toMatchObject({
      id: "sched-3", rawId: "3", tipo: "agendado", name: "Ana", photo: null,
      conversationId: 5, status: "Agendado", local: "Café Centro",
    });
  });

  it("resposta fora do formato vira lista vazia (sem quebrar a tela)", async () => {
    api.get.mockResolvedValue({ data: { erro: "x" } });
    await expect(fetchMatches()).resolves.toEqual([]);
  });

  it("um match aceito NÃO gera card duplicado: o agendado substitui o 'A combinar'", async () => {
    api.get.mockResolvedValue({
      data: [
        // match "A combinar" com Regis (otherUserId REGIS)
        { id: "match-r", tipo: "match", matchName: "Regis", matchId: 8, otherUserId: "REGIS", fotos: [] },
        // evento agendado com a MESMA pessoa (Regis) → deve colapsar em 1 card
        { id: "sched-9", tipo: "agendado", titulo: "Café", matchName: "Regis", matchId: 8, otherUserId: "REGIS",
          data_encontro: "2026-11-18T15:07:00", local: "Centro", fotos: [] },
        { id: "match-p", tipo: "match", matchName: "perigoboy", matchId: 3, otherUserId: "PERIGO", fotos: [] },
      ],
    });
    const list = await fetchMatches();
    expect(list).toHaveLength(2); // Regis (1x) + perigoboy (1x)
    const regis = list.filter((e) => e.otherUserId === "REGIS");
    expect(regis).toHaveLength(1);
    expect(regis[0].tipo).toBe("agendado");
    expect(list.some((e) => e.otherUserId === "PERIGO" && e.tipo === "match")).toBe(true);
  });
});

describe("dedupeEncontros", () => {
  it("prioriza o agendado e, sem otherUserId, usa a conversa como chave", () => {
    const list = dedupeEncontros([
      { id: "match-a", tipo: "match", conversationId: 5 },
      { id: "sched-a", tipo: "agendado", conversationId: 5 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].tipo).toBe("agendado");
  });

  it("mantém pessoas diferentes separadas", () => {
    const list = dedupeEncontros([
      { id: "m1", tipo: "match", otherUserId: "A" },
      { id: "m2", tipo: "match", otherUserId: "B" },
    ]);
    expect(list).toHaveLength(2);
  });
});

describe("normalizeEncontro", () => {
  it("reescreve foto local para o IP da API (carrega no Android)", () => {
    const n = normalizeEncontro({ id: "match-1", matchName: "Ana", fotos: ["http://localhost:3000/u/a.jpg"] });
    expect(n.photo).toBe("http://192.168.1.4:3000/u/a.jpg");
  });

  it("sem foto deixa photo null (Avatar mostra iniciais)", () => {
    expect(normalizeEncontro({ id: "match-1", matchName: "Ana", fotos: [] }).photo).toBeNull();
  });
});

describe("cancelEncontro", () => {
  it("encontro agendado chama a rota de cancelamento", async () => {
    api.delete.mockResolvedValue({ data: { success: true } });
    await cancelEncontro({ tipo: "agendado", rawId: "3" });
    expect(api.delete).toHaveBeenCalledWith("/api/events/cancelar/3");
  });

  it("match não tem rota de desfazer: resolve sem chamar a API", async () => {
    await expect(cancelEncontro({ tipo: "match", rawId: "abc" })).resolves.toEqual({ skipped: true });
    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe("agenda do encontro", () => {
  it("formatEncontroDate formata pt-BR e tolera inválido", () => {
    expect(formatEncontroDate("2026-11-18T15:07:00")).toMatch(/18\/11\/2026/);
    expect(formatEncontroDate(null)).toBeNull();
    expect(formatEncontroDate("lixo")).toBeNull();
  });
  it("googleCalendarUrl monta o link do Google Agenda", () => {
    const url = googleCalendarUrl({ titulo: "Café", scheduledAt: "2026-11-18T15:07:00", local: "Centro", nota: "oi" });
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=");
    expect(decodeURIComponent(url)).toContain("Café");
    expect(googleCalendarUrl({ scheduledAt: null })).toBeNull();
  });
  it("normalizeEncontro agendado traz dateTime, status e googleUrl", () => {
    const n = normalizeEncontro({ id: "sched-3", tipo: "agendado", titulo: "Café", data_encontro: "2026-11-18T15:07:00", local: "Centro", matchId: 5, fotos: [] });
    expect(n.status).toBe("Agendado");
    expect(n.dateTime).toMatch(/18\/11\/2026/);
    expect(n.googleUrl).toContain("calendar.google.com");
  });
});
