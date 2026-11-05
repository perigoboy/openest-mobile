import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Matches from "../../src/screens/Matches";

describe("Matches", () => {
  it("shows a sample conversation and opens its Chat room", () => {
    const navigation = { navigate: jest.fn() };
    render(<Matches navigation={navigation} />);

    expect(screen.getByText("Conversas")).toBeTruthy();
    expect(screen.getByText("Mariana Costa")).toBeTruthy();
    expect(
      screen.getByText("Também gostei! Foi muito legal te conhecer 😊")
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("conversation-mariana-costa"));

    expect(navigation.navigate).toHaveBeenCalledWith(
      "Chat",
      expect.objectContaining({
        contact: expect.objectContaining({ name: "Mariana Costa" }),
      })
    );
  });
});
