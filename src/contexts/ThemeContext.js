// Tema do app (Claro / Escuro / Automático), persistido no aparelho.
//
// - `mode` é a ESCOLHA do usuário: 'light' | 'dark' | 'system'.
// - `scheme` é o que está valendo agora: 'light' | 'dark' (no 'system',
//   segue o tema do celular e muda junto com ele).
// - `colors` é a paleta ativa (src/styles/theme.js).
//
// Telas usam `useThemedStyles(createStyles)` — os estilos são criados uma
// vez por paleta e reaproveitados (cache), então trocar o tema recolore o
// app inteiro na hora, sem custo por render.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palettes } from "../styles/theme";

export const THEME_STORAGE_KEY = "@openest/theme-mode";
export const THEME_MODES = ["light", "dark", "system"];

export function resolveScheme(mode, systemScheme) {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme === "light" ? "light" : "dark";
}

const DEFAULT_SCHEME = "dark";

const ThemeContext = createContext({
  mode: "system",
  scheme: DEFAULT_SCHEME,
  isDark: true,
  colors: palettes[DEFAULT_SCHEME],
  ready: true,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children, initialMode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState(THEME_MODES.includes(initialMode) ? initialMode : "system");
  const [ready, setReady] = useState(THEME_MODES.includes(initialMode));

  // Recupera a escolha salva (se houver) na abertura do app.
  useEffect(() => {
    if (THEME_MODES.includes(initialMode)) return undefined;
    let cancelado = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((salvo) => {
        if (!cancelado && THEME_MODES.includes(salvo)) setModeState(salvo);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setReady(true);
      });
    return () => {
      cancelado = true;
    };
  }, [initialMode]);

  const setMode = useCallback((next) => {
    if (!THEME_MODES.includes(next)) return;
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme = resolveScheme(mode, systemScheme);

  const toggle = useCallback(() => {
    setMode(scheme === "dark" ? "light" : "dark");
  }, [scheme, setMode]);

  const value = useMemo(
    () => ({
      mode,
      scheme,
      isDark: scheme === "dark",
      colors: palettes[scheme],
      ready,
      setMode,
      toggle,
    }),
    [mode, scheme, ready, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Cache: fábrica de estilos → (paleta → estilos). As paletas são objetos
// fixos, então cada tela cria seus estilos no máximo uma vez por tema.
const styleCache = new WeakMap();

export function getThemedStyles(factory, colors) {
  let porPaleta = styleCache.get(factory);
  if (!porPaleta) {
    porPaleta = new WeakMap();
    styleCache.set(factory, porPaleta);
  }
  let styles = porPaleta.get(colors);
  if (!styles) {
    styles = factory(colors);
    porPaleta.set(colors, styles);
  }
  return styles;
}

export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return getThemedStyles(factory, colors);
}
