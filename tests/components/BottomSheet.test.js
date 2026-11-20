// Gaveta inferior (ActionSheet) usada no menu de anexos, nas ações da
// mensagem, nas opções do contato e na troca de foto do perfil.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ActionSheet } from "../../src/components/BottomSheet";
import { ThemeProvider } from "../../src/contexts/ThemeContext";
import { darkColors, lightColors } from "../../src/styles/theme";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (p) => React.createElement(Text, p, p.name) };
});

function montar(props = {}, modo = "dark") {
  const onClose = jest.fn();
  const camera = jest.fn();
  const apagar = jest.fn();
  render(
    <ThemeProvider initialMode={modo}>
      <ActionSheet
        testID="sheet"
        visible
        title="Enviar"
        onClose={onClose}
        options={[
          { key: "camera", label: "Câmera", icon: "camera-outline", onPress: camera },
          { key: "apagar", label: "Apagar", icon: "trash-outline", destructive: true, onPress: apagar },
        ]}
        {...props}
      />
    </ThemeProvider>
  );
  return { onClose, camera, apagar };
}

describe("ActionSheet", () => {
  it("lista as opções com ícone vetorial e título", () => {
    montar();
    expect(screen.getByText("Enviar")).toBeTruthy();
    expect(screen.getByText("Câmera")).toBeTruthy();
    expect(screen.getByText("camera-outline")).toBeTruthy(); // ícone, não emoji
  });

  it("tocar numa opção fecha a gaveta e executa a ação", () => {
    const { onClose, camera } = montar();
    fireEvent.press(screen.getByTestId("action-camera"));
    expect(onClose).toHaveBeenCalled();
    expect(camera).toHaveBeenCalled();
  });

  it("Cancelar e tocar fora fecham sem executar nada", () => {
    const { onClose, camera } = montar();
    fireEvent.press(screen.getByTestId("sheet-cancel"));
    fireEvent.press(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(camera).not.toHaveBeenCalled();
  });

  it("ação destrutiva aparece em vermelho", () => {
    montar();
    const rotulo = screen.getByText("Apagar");
    const estilo = [].concat(rotulo.props.style).filter(Boolean);
    expect(estilo.some((s) => s.color === darkColors.dangerText)).toBe(true);
  });

  it("acompanha o tema (claro)", () => {
    montar({}, "light");
    const rotulo = screen.getByText("Câmera");
    const estilo = Object.assign({}, ...[].concat(rotulo.props.style).filter(Boolean));
    expect(estilo.color).toBe(lightColors.textPrimary);
  });
});
