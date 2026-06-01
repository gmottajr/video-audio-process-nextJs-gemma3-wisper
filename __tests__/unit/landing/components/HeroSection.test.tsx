/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HeroSection } from "@/app/_components/landing/components/HeroSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  Lock: () => <svg data-testid="icon-lock" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  Headphones: () => <svg data-testid="icon-headphones" />,
}));

jest.mock("@/components/WaveformVisualizer", () => ({
  WaveformVisualizer: () => <div data-testid="waveform-visualizer" />,
}));

describe("HeroSection", () => {
  it("renders the Neural Groove h1 headline", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1, name: /neural groove/i })).toBeInTheDocument();
  });

  it("renders the Spectrum Divergent subtitle", () => {
    render(<HeroSection />);
    expect(screen.getByText("Spectrum Divergent")).toBeInTheDocument();
  });

  it("renders the privacy pill", () => {
    render(<HeroSection />);
    expect(screen.getByText(/100% Private/)).toBeInTheDocument();
  });

  it("renders the Start Processing link pointing to /forge", () => {
    render(<HeroSection />);
    const link = screen.getByRole("link", { name: /start processing/i });
    expect(link).toHaveAttribute("href", "/forge");
  });

  it("renders the Explore the Music button", () => {
    render(<HeroSection />);
    expect(screen.getByRole("button", { name: /explore the music/i })).toBeInTheDocument();
  });

  it("renders the WaveformVisualizer", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("waveform-visualizer")).toBeInTheDocument();
  });

  it("renders the tagline copy", () => {
    render(<HeroSection />);
    expect(screen.getByText(/zero uploads/i)).toBeInTheDocument();
  });
});
