// tests/helpers/a11y.js — utilitários de acessibilidade para os testes (T052).

// ----- Contraste WCAG 2.1 -------------------------------------------------
function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

// Aceita #RRGGBB e rgba(r, g, b, a). Devolve [r, g, b, alpha].
function parseColor(color) {
  const value = String(color).trim();
  const hex = value.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(",").map((part) => parseFloat(part));
    return [r, g, b, a];
  }
  throw new Error(`Cor não suportada no teste de contraste: ${color}`);
}

function luminance(rgb) {
  const [r, g, b] = rgb.slice(0, 3).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Cor translúcida é medida como a tela de fato desenha: composta sobre o fundo.
function composite(foreground, background) {
  const alpha = foreground[3];
  return [0, 1, 2].map((i) => foreground[i] * alpha + background[i] * (1 - alpha));
}

function contrastRatio(foreground, background) {
  const bg = parseColor(background);
  const fg = composite(parseColor(foreground), bg);
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// WCAG AA: 4.5:1 texto normal · 3:1 texto grande (≥ 18pt / 14pt negrito) e ícones.
const AA_TEXT = 4.5;
const AA_LARGE_OR_ICON = 3;

// ----- Nome acessível -----------------------------------------------------
function collectText(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const children = node.children || [];
  return children.map(collectText).join(" ");
}

// O que o TalkBack/VoiceOver lê: accessibilityLabel ou o texto interno.
function accessibleName(element) {
  const label = element?.props?.accessibilityLabel;
  if (typeof label === "string" && label.trim()) return label.trim();
  return collectText(element).replace(/\s+/g, " ").trim();
}

// Todo elemento com papel interativo precisa ter um nome legível.
function findUnnamedControls(screen, roles = ["button", "tab", "link", "switch", "radio"]) {
  const unnamed = [];
  roles.forEach((role) => {
    screen.queryAllByRole(role).forEach((el) => {
      if (!accessibleName(el)) unnamed.push(`${role}${el.props.testID ? `#${el.props.testID}` : ""}`);
    });
  });
  return unnamed;
}

module.exports = {
  AA_TEXT,
  AA_LARGE_OR_ICON,
  contrastRatio,
  accessibleName,
  findUnnamedControls,
};
