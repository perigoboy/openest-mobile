// tests/config/appConfig.test.js
// T051 — metadados, ícones e SplashScreen.
// Erros de app.json/ícones só aparecem no build (EAS/prebuild), bem depois
// do commit. Este teste pega esses "erros bobos" na hora do `npm test`.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "../..");
const { expo } = require("../../app.json");
const pkg = require("../../package.json");

const resolveAsset = (rel) => path.join(ROOT, rel);
const HEX = /^#[0-9A-Fa-f]{6}$/;

function readPng(rel) {
  return PNG.sync.read(fs.readFileSync(resolveAsset(rel)));
}

// colorType no cabeçalho IHDR: 2 = RGB (sem alfa), 6 = RGBA.
function pngColorType(rel) {
  return fs.readFileSync(resolveAsset(rel))[25];
}

function pluginConfig(name) {
  const entry = expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : entry ? {} : undefined;
}

describe("metadados (app.json)", () => {
  it("tem nome, versão e descrição de produto", () => {
    expect(expo.name).toBe("Openest");
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.description).toEqual(expect.any(String));
  });

  it("versão do app.json acompanha o package.json", () => {
    expect(expo.version).toBe(pkg.version);
  });

  it("identificadores nativos válidos (necessários para build e push)", () => {
    const reverseDns = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
    expect(expo.android.package).toMatch(reverseDns);
    expect(expo.ios.bundleIdentifier).toMatch(reverseDns);
    expect(Number.isInteger(expo.android.versionCode)).toBe(true);
  });

  it("esquema de deep link do T049", () => {
    expect(expo.scheme).toBe("openest");
  });

  it("cores em hexadecimal válido", () => {
    expect(expo.backgroundColor).toMatch(HEX);
    expect(expo.android.adaptiveIcon.backgroundColor).toMatch(HEX);
  });
});

describe("ícones oficiais (assets/)", () => {
  it("ícone principal: PNG quadrado 1024x1024 e SEM transparência (exigência da App Store)", () => {
    const icon = readPng(expo.icon);
    expect([icon.width, icon.height]).toEqual([1024, 1024]);
    expect(pngColorType(expo.icon)).toBe(2);
  });

  it("não usa mais os placeholders do template Expo", () => {
    // O placeholder do template tem fundo azul-claro (#E6F4FE-ish) no canto.
    const icon = readPng(expo.icon);
    const [r, g, b] = icon.data.slice(0, 3);
    expect(b > 200 && g > 200 && r > 200).toBe(false);
    expect(expo.android.adaptiveIcon.backgroundColor.toUpperCase()).not.toBe("#E6F4FE");
  });

  it("adaptive icon do Android: arquivos existem e são quadrados", () => {
    const { foregroundImage, backgroundImage, monochromeImage } = expo.android.adaptiveIcon;
    [foregroundImage, backgroundImage, monochromeImage].forEach((rel) => {
      const img = readPng(rel);
      expect(img.width).toBe(img.height);
      expect(img.width).toBeGreaterThanOrEqual(512);
    });
  });

  it("logo do adaptive icon cabe na área segura (círculo de 66%)", () => {
    const fg = readPng(expo.android.adaptiveIcon.foregroundImage);
    const c = fg.width / 2;
    const safeRadius = (fg.width * 0.66) / 2;
    let outside = 0;
    for (let y = 0; y < fg.height; y += 4) {
      for (let x = 0; x < fg.width; x += 4) {
        const alpha = fg.data[(y * fg.width + x) * 4 + 3];
        if (alpha > 32 && Math.hypot(x - c, y - c) > safeRadius) outside += 1;
      }
    }
    expect(outside).toBe(0);
  });

  it("ícone monocromático só tem pixels brancos (Android 13+ aplica a cor do tema)", () => {
    const mono = readPng(expo.android.adaptiveIcon.monochromeImage);
    for (let i = 0; i < mono.data.length; i += 4) {
      if (mono.data[i + 3] > 0) {
        expect(mono.data[i] + mono.data[i + 1] + mono.data[i + 2]).toBe(765);
      }
    }
  });

  it("favicon existe", () => {
    expect(fs.existsSync(resolveAsset(expo.web.favicon))).toBe(true);
  });
});

describe("SplashScreen nativa (expo-splash-screen)", () => {
  const splash = pluginConfig("expo-splash-screen");

  it("está configurada com imagem, largura e cor de fundo", () => {
    expect(splash).toBeDefined();
    expect(splash.backgroundColor).toMatch(HEX);
    expect(splash.imageWidth).toBeGreaterThan(0);
  });

  it("imagem da splash existe e tem fundo transparente (a cor vem do app.json)", () => {
    const img = readPng(splash.image);
    expect(img.width).toBe(img.height);
    expect(img.data[3]).toBe(0); // canto superior esquerdo transparente
  });
});

describe("ícone de notificação (T048)", () => {
  const notif = pluginConfig("expo-notifications");

  it("plugin configurado com ícone 96x96 branco + transparente e cor válida", () => {
    expect(notif).toBeDefined();
    expect(notif.color).toMatch(HEX);
    const img = readPng(notif.icon);
    expect([img.width, img.height]).toEqual([96, 96]);
    let opaque = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] > 0) {
        opaque += 1;
        expect(img.data[i] + img.data[i + 1] + img.data[i + 2]).toBe(765);
      }
    }
    expect(opaque).toBeGreaterThan(0);
  });
});

describe("plugins", () => {
  it("todo plugin do app.json está instalado no package.json", () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expo.plugins
      .map((p) => (Array.isArray(p) ? p[0] : p))
      .forEach((name) => {
        expect(deps).toHaveProperty(name);
      });
  });

  it("todas as imagens referenciadas existem", () => {
    const refs = JSON.stringify(expo).match(/\.\/assets\/[^"]+/g) || [];
    expect(refs.length).toBeGreaterThan(0);
    refs.forEach((rel) => expect(fs.existsSync(resolveAsset(rel))).toBe(true));
  });
});
