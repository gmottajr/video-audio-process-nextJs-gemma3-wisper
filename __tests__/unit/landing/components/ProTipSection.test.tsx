/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProTipSection } from "@/app/_components/landing/components/ProTipSection";

jest.mock("lucide-react", () => ({
  Lightbulb: () => <svg data-testid="icon-lightbulb" />,
}));

describe("ProTipSection", () => {
  it("renders the Pro Tip badge", () => {
    render(<ProTipSection />);
    expect(screen.getByText(/pro tip/i)).toBeInTheDocument();
  });

  it("renders the Transcribe Specific Segments heading", () => {
    render(<ProTipSection />);
    expect(screen.getByRole("heading", { name: /transcribe specific segments/i })).toBeInTheDocument();
  });

  it("renders the tip body copy mentioning Extract Audio", () => {
    render(<ProTipSection />);
    expect(screen.getByText(/extract audio/i)).toBeInTheDocument();
  });

  it("renders the lightbulb icon", () => {
    render(<ProTipSection />);
    expect(screen.getByTestId("icon-lightbulb")).toBeInTheDocument();
  });
});
