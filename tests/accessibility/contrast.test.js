// tests/accessibility/contrast.test.js
// T052 — contraste de cores (WCAG 2.1 nível AA) das combinações usadas no app.
import { colors } from "../../src/styles/theme";
import { VARIANT_COLORS } from "../../src/components/Toast";
import { AA_LARGE_OR_ICON, AA_TEXT, contrastRatio } from "../helpers/a11y";

// [descrição, cor do texto/ícone, cor de fundo, mínimo exigido]
const TEXT_PAIRS = [
  ["texto principal sobre o fundo", colors.text, colors.background],
  ["texto principal sobre cards (surface)", colors.text, colors.surface],
  ["texto principal sobre surfaceAlt (bolha recebida / banner)", colors.text, colors.surfaceAlt],
  ["texto secundário sobre o fundo", colors.textMuted, colors.background],
  ["texto secundário sobre cards", colors.textMuted, colors.surface],
  ["hora da mensagem recebida (textMuted / surfaceAlt)", colors.textMuted, colors.surfaceAlt],
  ["texto da minha mensagem (text / primaryDark)", colors.text, colors.primaryDark],
  ["hora da minha mensagem (primaryLight / primaryDark)", colors.primaryLight, colors.primaryDark],
  ["'digitando…' no cabeçalho do chat (primaryLight / fundo)", colors.primaryLight, colors.background],
  ["botões primários (branco / primary)", colors.white, colors.primary],
  ["Toast de sucesso", colors.white, VARIANT_COLORS.success],
  ["Toast de erro", colors.white, VARIANT_COLORS.error],
  ["Toast informativo", colors.white, VARIANT_COLORS.info],
];

const ICON_PAIRS = [
  ["ícones da tab bar (#6D1BC7 sobre o vidro claro)", "#6D1BC7", "#F4ECFF"],
  ["ícone de alerta do banner de rede", colors.warning, colors.surfaceAlt],
  ["ícone de falha de envio (sobre a minha bolha)", colors.dangerLight, colors.primaryDark],
  ["indicador 'reconectando'", colors.warning, colors.background],
];

describe("contraste de texto ≥ 4.5:1 (WCAG AA)", () => {
  it.each(TEXT_PAIRS)("%s", (_, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("contraste de ícones/elementos gráficos ≥ 3:1 (WCAG AA)", () => {
  it.each(ICON_PAIRS)("%s", (_, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_LARGE_OR_ICON);
  });
});

describe("regressões conhecidas", () => {
  it("as cores puras de sucesso/erro NÃO servem de fundo para texto branco", () => {
    // Por isso os Toasts usam successDark/dangerDark.
    expect(contrastRatio(colors.white, colors.success)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(colors.white, colors.danger)).toBeLessThan(AA_TEXT);
  });

  it("textMuted sobre a minha bolha não passa (por isso a hora usa primaryLight)", () => {
    expect(contrastRatio(colors.textMuted, colors.primaryDark)).toBeLessThan(AA_TEXT);
  });
});
