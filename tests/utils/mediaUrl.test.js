// tests/utils/mediaUrl.test.js
// Fotos precisam carregar no Android: "localhost" no celular é o próprio celular.
import { resolveMediaUrl } from "../../src/utils/mediaUrl";
import { normalizeProfile } from "../../src/services/discovery";

const API = "http://192.168.1.4:3000";

describe("resolveMediaUrl", () => {
  it("mantém URLs públicas (Cloudinary) intactas", () => {
    const url = "https://res.cloudinary.com/dju4fflof/image/upload/v1/openest/a.jpg";
    expect(resolveMediaUrl(url, API)).toBe(url);
  });

  it.each([
    ["http://localhost:3000/uploads/a.jpg"],
    ["http://127.0.0.1:3000/uploads/a.jpg"],
    ["http://0.0.0.0:3000/uploads/a.jpg"],
    ["http://10.0.2.2:3000/uploads/a.jpg"],
  ])("troca host local pelo IP da API: %s", (url) => {
    expect(resolveMediaUrl(url, API)).toBe("http://192.168.1.4:3000/uploads/a.jpg");
  });

  it("usa a porta da API mesmo se a URL local não tiver porta", () => {
    expect(resolveMediaUrl("http://localhost/img/x.png?v=2", API)).toBe("http://192.168.1.4:3000/img/x.png?v=2");
  });

  it("prefixa caminhos relativos com a API", () => {
    expect(resolveMediaUrl("/uploads/a.jpg", API)).toBe("http://192.168.1.4:3000/uploads/a.jpg");
    expect(resolveMediaUrl("/uploads/a.jpg", `${API}/`)).toBe("http://192.168.1.4:3000/uploads/a.jpg");
  });

  it("descarta valores que não são URL de imagem", () => {
    expect(resolveMediaUrl("", API)).toBeNull();
    expect(resolveMediaUrl(null, API)).toBeNull();
    expect(resolveMediaUrl("foto.jpg", API)).toBeNull();
    expect(resolveMediaUrl("file:///storage/a.jpg", API)).toBeNull();
  });

  it("sem API configurada, não inventa host", () => {
    expect(resolveMediaUrl("http://localhost:3000/a.jpg", undefined)).toBe("http://localhost:3000/a.jpg");
    expect(resolveMediaUrl("/uploads/a.jpg", undefined)).toBeNull();
  });
});

describe("normalizeProfile usa o resolveMediaUrl", () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_API_URL;
  beforeAll(() => {
    process.env.EXPO_PUBLIC_API_URL = API;
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_API_URL = ORIGINAL;
  });

  it("foto da galeria com localhost carrega pelo IP da API", () => {
    const profile = normalizeProfile({ id: "1", name: "Ana", photos: ["http://localhost:3000/uploads/ana.jpg"] });
    expect(profile.photo).toBe("http://192.168.1.4:3000/uploads/ana.jpg");
  });

  it("foto do Cloudinary (formato real do banco) é usada como está", () => {
    const url = "https://res.cloudinary.com/dju4fflof/image/upload/v1781042301/openest_perfis/x.jpg";
    expect(normalizeProfile({ id: "1", name: "Leandro", photos: [], foto_url: url }).photo).toBe(url);
  });
});
