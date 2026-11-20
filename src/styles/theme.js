// Tokens de design do Openest.
//
// As cores vêm em DUAS paletas (claro/escuro) com os MESMOS nomes semânticos.
// Telas e componentes nunca escolhem cor pela aparência ("roxo", "cinza"),
// e sim pelo papel ("textPrimary", "bubbleSent"). Quem decide a paleta ativa
// é o ThemeContext (src/contexts/ThemeContext.js) — use `useTheme()` ou
// `useThemedStyles()` em vez de importar `colors` direto.

// Cores fixas de feedback (iguais nos dois modos).
const feedback = {
  danger: "#E5484D",
  dangerDark: "#C0392B", // fundo com texto branco: 5.4:1 (WCAG AA)
  dangerLight: "#FF8A80",
  warning: "#F5A524",
  success: "#2FB36F",
  successDark: "#1E8449", // fundo com texto branco: 4.7:1
  readTick: "#53BDEB", // 2 checks azuis (visualizada)
  white: "#FFFFFF",
  black: "#000000",
};

export const lightColors = {
  ...feedback,
  scheme: "light",

  // Fundos e superfícies
  background: "#F8F7FA",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#F1EEF6", // chips, campos, áreas de apoio
  border: "#E5E2EC",
  divider: "#EEEBF3",
  overlay: "rgba(17, 12, 28, 0.45)",

  // Texto
  textPrimary: "#1A1523",
  textSecondary: "#6B6578",
  textTertiary: "#837D90",
  onPrimary: "#FFFFFF",

  // Marca
  primary: "#6D28D9",
  primaryPressed: "#5B21B6",
  accent: "#6D28D9", // texto/ícone roxo sobre superfície
  primarySoft: "#EDE7FB", // fundo tingido (selecionado, badge)
  successSoft: "#E6F6EE",
  successText: "#1E7A4C",
  dangerSoft: "#FDECEC",
  dangerText: "#C62828", // texto/ícone de ação destrutiva (5.6:1)

  // Chat
  chatBackground: "#F3F0F7",
  chatPattern: "#6D28D9",
  bubbleSent: "#6D28D9",
  bubbleSentText: "#FFFFFF",
  bubbleSentMeta: "rgba(255, 255, 255, 0.8)",
  bubbleReceived: "#FFFFFF",
  bubbleReceivedText: "#1A1523",
  bubbleReceivedMeta: "#6B6578",
  inputBg: "#FFFFFF",
  tick: "rgba(255, 255, 255, 0.8)",
  // Checks azuis FORA do balão (lista de conversas): o #53BDEB sobre branco
  // dá só 2.1:1; este tom passa no AA de ícones (3.7:1).
  readTickOnSurface: "#1A8CCB",

  // Barra de navegação
  tabBar: "#FFFFFF",
  tabActive: "#6D28D9",
  tabInactive: "#8C8699",

  // Aliases dos nomes antigos (telas ainda não migradas continuam funcionando)
  text: "#1A1523",
  textMuted: "#6B6578",
  surfaceAlt: "#F1EEF6",
  primaryDark: "#5B21B6",
  primaryLight: "#6D28D9",
};

export const darkColors = {
  ...feedback,
  scheme: "dark",

  background: "#0F0D15",
  surface: "#1B1824",
  surfaceElevated: "#221E2C",
  surfaceMuted: "#1B1824",
  border: "#2A2636",
  divider: "#221E2C",
  overlay: "rgba(0, 0, 0, 0.6)",

  textPrimary: "#F4F3F8",
  textSecondary: "#A19DB0",
  textTertiary: "#77728A",
  onPrimary: "#FFFFFF",

  primary: "#7C3AED",
  primaryPressed: "#6D28D9",
  accent: "#C4B5FD",
  primarySoft: "#2A2140",
  successSoft: "#16301F",
  successText: "#5DD39E",
  dangerSoft: "#3A1A21",
  dangerText: "#FF7A7F",

  chatBackground: "#0B0A10",
  chatPattern: "#C4B5FD",
  bubbleSent: "#5B21B6",
  bubbleSentText: "#F4F3F8",
  bubbleSentMeta: "rgba(244, 243, 248, 0.7)",
  bubbleReceived: "#221E2C",
  bubbleReceivedText: "#F4F3F8",
  bubbleReceivedMeta: "#8E899E",
  inputBg: "#1B1824",
  tick: "rgba(244, 243, 248, 0.7)",
  readTickOnSurface: "#53BDEB",

  tabBar: "#16131D",
  tabActive: "#C4B5FD",
  tabInactive: "#77728A",

  text: "#F4F3F8",
  textMuted: "#A19DB0",
  surfaceAlt: "#221E2C",
  primaryDark: "#6D28D9",
  primaryLight: "#C4B5FD",
};

export const palettes = { light: lightColors, dark: darkColors };

// Compatibilidade: módulos que ainda importam `colors` estático recebem a
// paleta escura (o visual histórico do app). Prefira `useTheme()`.
export const colors = darkColors;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

// Hierarquia tipográfica enxuta: poucos tamanhos, pesos consistentes.
export const typography = {
  h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  bodyStrong: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 12, fontWeight: "400" },
  label: { fontSize: 13, fontWeight: "600" },
};

const theme = { colors, spacing, radius, typography };

export default theme;
