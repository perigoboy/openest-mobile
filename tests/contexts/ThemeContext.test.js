// Tema Claro / Escuro / Automático: alternância, persistência e cache de estilos.
import React from "react";
import * as RN from "react-native";
import { Text, Pressable } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  getThemedStyles,
  resolveScheme,
  useTheme,
  useThemedStyles,
} from "../../src/contexts/ThemeContext";
import { darkColors, lightColors } from "../../src/styles/theme";

function Sonda() {
  const { mode, scheme, colors, setMode, toggle } = useTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="scheme">{scheme}</Text>
      <Text testID="bg">{colors.background}</Text>
      <Pressable testID="claro" onPress={() => setMode("light")} />
      <Pressable testID="escuro" onPress={() => setMode("dark")} />
      <Pressable testID="alternar" onPress={toggle} />
    </>
  );
}

const montar = (props) =>
  render(
    <ThemeProvider {...props}>
      <Sonda />
    </ThemeProvider>
  );

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("resolveScheme", () => {
  it("escolha explícita vence o tema do celular", () => {
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("dark", "light")).toBe("dark");
  });
  it("automático segue o celular (e cai no escuro se ele não informar)", () => {
    expect(resolveScheme("system", "light")).toBe("light");
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", null)).toBe("dark");
  });
});

describe("ThemeProvider", () => {
  it("sem escolha salva, segue o tema do celular", async () => {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("light");
    montar();
    await waitFor(() => expect(screen.getByTestId("mode").props.children).toBe("system"));
    expect(screen.getByTestId("scheme").props.children).toBe("light");
    expect(screen.getByTestId("bg").props.children).toBe(lightColors.background);
  });

  it("trocar para o Modo Escuro aplica na hora e SALVA no aparelho", async () => {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("light");
    montar();
    await waitFor(() => expect(screen.getByTestId("scheme").props.children).toBe("light"));

    fireEvent.press(screen.getByTestId("escuro"));

    expect(screen.getByTestId("scheme").props.children).toBe("dark");
    expect(screen.getByTestId("bg").props.children).toBe(darkColors.background);
    await waitFor(async () => expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe("dark"));
  });

  it("ao reabrir o app, restaura a escolha salva", async () => {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("dark");
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "light");

    montar();

    await waitFor(() => expect(screen.getByTestId("mode").props.children).toBe("light"));
    expect(screen.getByTestId("bg").props.children).toBe(lightColors.background);
  });

  it("valor inválido salvo é ignorado (fica no automático)", async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "roxo-neon");
    montar();
    await act(async () => {});
    expect(screen.getByTestId("mode").props.children).toBe("system");
  });

  it("alternar troca entre claro e escuro", async () => {
    montar({ initialMode: "light" });
    fireEvent.press(screen.getByTestId("alternar"));
    expect(screen.getByTestId("scheme").props.children).toBe("dark");
    fireEvent.press(screen.getByTestId("alternar"));
    expect(screen.getByTestId("scheme").props.children).toBe("light");
  });
});

describe("useThemedStyles", () => {
  const fabrica = jest.fn((colors) => ({ caixa: { backgroundColor: colors.background } }));

  it("cria os estilos uma vez por paleta (cache) e recolore ao trocar o tema", () => {
    const a = getThemedStyles(fabrica, darkColors);
    const b = getThemedStyles(fabrica, darkColors);
    expect(a).toBe(b); // mesmo objeto: sem recriar a cada render
    expect(fabrica).toHaveBeenCalledTimes(1);

    const claro = getThemedStyles(fabrica, lightColors);
    expect(claro.caixa.backgroundColor).toBe(lightColors.background);
    expect(fabrica).toHaveBeenCalledTimes(2);
  });

  it("um componente recolore ao trocar o tema", () => {
    const criar = (colors) => ({ txt: { color: colors.textPrimary } });
    function Rotulo() {
      const styles = useThemedStyles(criar);
      return <Text testID="rotulo" style={styles.txt}>oi</Text>;
    }
    function Tela() {
      const { setMode } = useTheme();
      return (
        <>
          <Rotulo />
          <Pressable testID="ir-claro" onPress={() => setMode("light")} />
        </>
      );
    }
    render(
      <ThemeProvider initialMode="dark">
        <Tela />
      </ThemeProvider>
    );
    expect(screen.getByTestId("rotulo").props.style.color).toBe(darkColors.textPrimary);
    fireEvent.press(screen.getByTestId("ir-claro"));
    expect(screen.getByTestId("rotulo").props.style.color).toBe(lightColors.textPrimary);
  });
});
