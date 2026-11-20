// tests/accessibility/contrast.test.js
// T052 — contraste de cores (WCAG 2.1 nível AA), agora para as DUAS paletas:
// tudo que passa no modo escuro precisa passar também no modo claro.
import { darkColors, lightColors } from "../../src/styles/theme";
import { VARIANT_COLORS } from "../../src/components/Toast";
import { AA_LARGE_OR_ICON, AA_TEXT, contrastRatio } from "../helpers/a11y";

// [descrição, token do texto, token do fundo]
const TEXT_PAIRS = [
  ["texto principal sobre o fundo", "textPrimary", "background"],
  ["texto principal sobre cards", "textPrimary", "surface"],
  ["texto principal sobre sheets/modais", "textPrimary", "surfaceElevated"],
  ["texto secundário sobre o fundo", "textSecondary", "background"],
  ["texto secundário sobre cards", "textSecondary", "surface"],
  ["texto secundário sobre chips/campos", "textSecondary", "surfaceMuted"],
  ["destaque roxo sobre o fundo", "accent", "background"],
  ["destaque roxo sobre cards", "accent", "surface"],
  ["destaque roxo sobre fundo tingido (selecionado)", "accent", "primarySoft"],
  ["botão primário (texto / primary)", "onPrimary", "primary"],
  ["texto da minha mensagem", "bubbleSentText", "bubbleSent"],
  ["hora da minha mensagem", "bubbleSentMeta", "bubbleSent"],
  ["texto da mensagem recebida", "bubbleReceivedText", "bubbleReceived"],
  ["hora da mensagem recebida", "bubbleReceivedMeta", "bubbleReceived"],
  ["texto sobre o fundo do chat", "textPrimary", "chatBackground"],
  ["selo 'Agendado' (verde suave)", "successText", "successSoft"],
  ["ação destrutiva (Apagar/Desistir) sobre cards", "dangerText", "surface"],
  ["ação destrutiva sobre sheets", "dangerText", "surfaceElevated"],
  ["ação destrutiva sobre fundo vermelho suave", "dangerText", "dangerSoft"],
];

const ICON_PAIRS = [
  ["check cinza (enviada/entregue) sobre a minha bolha", "tick", "bubbleSent"],
  ["checks azuis (visualizada) sobre a minha bolha", "readTick", "bubbleSent"],
  ["checks azuis na lista de conversas", "readTickOnSurface", "surface"],
  ["checks cinzas na lista de conversas", "textTertiary", "surface"],
  ["ícone ativo da barra inferior", "tabActive", "tabBar"],
  ["ícone inativo da barra inferior", "tabInactive", "tabBar"],
  ["texto terciário / placeholder", "textTertiary", "surface"],
  ["ícone de falha de envio sobre a minha bolha", "dangerLight", "bubbleSent"],
];

describe.each([
  ["modo claro", lightColors],
  ["modo escuro", darkColors],
])("%s", (_, colors) => {
  describe("contraste de texto ≥ 4.5:1 (WCAG AA)", () => {
    it.each(TEXT_PAIRS)("%s", (__, fg, bg) => {
      expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });

  describe("contraste de ícones/elementos gráficos ≥ 3:1 (WCAG AA)", () => {
    it.each(ICON_PAIRS)("%s", (__, fg, bg) => {
      expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_LARGE_OR_ICON);
    });
  });
});

describe("Toasts (iguais nos dois modos)", () => {
  it.each([
    ["sucesso", VARIANT_COLORS.success],
    ["erro", VARIANT_COLORS.error],
    ["informativo", VARIANT_COLORS.info],
  ])("texto branco sobre o toast de %s", (_, bg) => {
    expect(contrastRatio("#FFFFFF", bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("regressões conhecidas", () => {
  it("as cores puras de sucesso/erro NÃO servem de fundo para texto branco", () => {
    // Por isso os Toasts usam successDark/dangerDark.
    expect(contrastRatio("#FFFFFF", darkColors.success)).toBeLessThan(AA_TEXT);
    expect(contrastRatio("#FFFFFF", darkColors.danger)).toBeLessThan(AA_TEXT);
  });

  it("o cinza claro antigo da hora recebida reprovaria no modo claro", () => {
    // Era #8C8699 sobre branco (3.5:1). Hoje usa bubbleReceivedMeta.
    expect(contrastRatio("#8C8699", lightColors.bubbleReceived)).toBeLessThan(AA_TEXT);
  });
});
