// tests/components/ScheduleModal.test.js
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import ScheduleModal, { formatDateTimeLocal } from "../../src/components/ScheduleModal";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: (p) => React.createElement(Text, p, p.name) };
});
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: (props) => React.createElement(View, { testID: "dtpicker", ...props }) };
});

describe("formatDateTimeLocal", () => {
  it("formata YYYY-MM-DDTHH:mm no horário local", () => {
    expect(formatDateTimeLocal(new Date(2026, 10, 18, 15, 7))).toBe("2026-11-18T15:07");
  });
  it("tolera data inválida", () => {
    expect(formatDateTimeLocal(null)).toBe("");
    expect(formatDateTimeLocal(new Date("lixo"))).toBe("");
  });
});

describe("ScheduleModal", () => {
  function setup(props = {}) {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    render(
      <ScheduleModal visible contactName="Ana" conversationId={9} otherUserId="u2" onClose={onClose} onSubmit={onSubmit} {...props} />
    );
    return { onSubmit, onClose };
  }

  it("prefill do título com o nome do contato", () => {
    setup();
    expect(screen.getByTestId("schedule-titulo").props.value).toBe("Encontro com Ana");
  });

  it("submit começa desabilitado (sem data) e não envia", () => {
    const { onSubmit } = setup();
    expect(screen.getByTestId("schedule-submit").props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByTestId("schedule-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("escolher data+hora habilita o envio e manda o payload no formato do web", () => {
    const { onSubmit } = setup();
    fireEvent.changeText(screen.getByTestId("schedule-local"), "Praça");
    // abre o picker (modo data) e seleciona data → depois hora
    fireEvent.press(screen.getByTestId("schedule-pick-datetime"));
    act(() => {
      screen.getByTestId("schedule-datetimepicker").props.onChange({ type: "set" }, new Date(2026, 10, 18, 0, 0));
    });
    act(() => {
      screen.getByTestId("schedule-datetimepicker").props.onChange({ type: "set" }, new Date(2026, 10, 18, 15, 7));
    });

    fireEvent.press(screen.getByTestId("schedule-submit"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 9,
        other_user_id: "u2",
        titulo: "Encontro com Ana",
        scheduled_at: "2026-11-18T15:07",
        local: "Praça",
      })
    );
  });

  it("fechar aciona onClose", () => {
    const { onClose } = setup();
    fireEvent.press(screen.getByTestId("schedule-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
