/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StatsSection } from "@/app/_components/landing/components/StatsSection";

jest.mock("lucide-react", () => ({
  Shield:   () => <svg data-testid="icon-shield" />,
  WifiOff:  () => <svg data-testid="icon-wifioff" />,
  Database: () => <svg data-testid="icon-database" />,
  Cpu:      () => <svg data-testid="icon-cpu" />,
}));

describe("StatsSection", () => {
  it("renders the section heading", () => {
    render(<StatsSection />);
    expect(screen.getByRole("heading", { name: /your data never leaves your device/i })).toBeInTheDocument();
  });

  it("renders all four privacy stat titles", () => {
    render(<StatsSection />);
    expect(screen.getByText("100% Private")).toBeInTheDocument();
    expect(screen.getByText("Zero Uploads")).toBeInTheDocument();
    expect(screen.getByText("Zero Data Collection")).toBeInTheDocument();
    expect(screen.getByText("In-Browser Processing")).toBeInTheDocument();
  });

  it("renders all four privacy stat descriptions", () => {
    render(<StatsSection />);
    expect(screen.getByText(/end-to-end in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/no server ever touches/i)).toBeInTheDocument();
    expect(screen.getByText(/no analytics on your content/i)).toBeInTheDocument();
    expect(screen.getByText(/web apis power everything/i)).toBeInTheDocument();
  });

  it("renders the eyebrow label", () => {
    render(<StatsSection />);
    expect(screen.getByText(/privacy by architecture/i)).toBeInTheDocument();
  });
});
