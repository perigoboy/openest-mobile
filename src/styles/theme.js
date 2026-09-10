export const colors = {
  // Cor de marca (referência ao 💜 do Like no Discovery)
  primary: "#8E44AD",
  primaryDark: "#6C3483",
  primaryLight: "#D2B4DE",

  // Feedback / prioridades (mesmo código de cores do backlog)
  danger: "#E74C3C",   // Pass / erros / P0
  warning: "#F1C40F",  // Alertas / P1
  success: "#2ECC71",  // Confirmações / P2

  background: "#0D0D0F",
  surface: "#1A1A1E",
  surfaceAlt: "#242429",

  text: "#F5F5F7",
  textMuted: "#A0A0A8",
  border: "#2E2E33",

  white: "#FFFFFF",
  black: "#000000",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" },
  h2: { fontSize: 22, fontWeight: "700" },
  h3: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 15, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "400" },
};

const theme = { colors, spacing, radius, typography };

export default theme;
