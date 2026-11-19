// tests/services/giphy.test.js — seletor de GIFs
import { normalizeGiphy, searchGifs, fetchTrendingGifs, getGiphyKey } from "../../src/services/giphy";

describe("normalizeGiphy", () => {
  it("extrai id, url e preview", () => {
    const out = normalizeGiphy({
      data: [
        { id: "a", images: { original: { url: "https://giphy/a.gif" }, fixed_width: { url: "https://giphy/a-sm.gif" } } },
        { id: "b", images: {} }, // sem url → descartado
      ],
    });
    expect(out).toEqual([{ id: "a", url: "https://giphy/a.gif", preview: "https://giphy/a-sm.gif" }]);
  });
  it("tolera resposta vazia", () => {
    expect(normalizeGiphy({})).toEqual([]);
    expect(normalizeGiphy(null)).toEqual([]);
  });
});

describe("busca no Giphy", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("search usa o endpoint /search com o termo", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    await searchGifs("gato");
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain("/gifs/search?");
    expect(url).toContain("q=gato");
    expect(url).toContain(`api_key=${getGiphyKey()}`);
  });

  it("termo vazio cai em trending", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    await searchGifs("   ");
    expect(global.fetch.mock.calls[0][0]).toContain("/gifs/trending?");
  });

  it("propaga erro de rede", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchTrendingGifs()).rejects.toThrow("429");
  });
});
