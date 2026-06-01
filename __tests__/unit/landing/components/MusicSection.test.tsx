/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MusicSection } from "@/app/_components/landing/components/MusicSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  Headphones:   () => <svg data-testid="icon-headphones" />,
}));

describe("MusicSection", () => {
  it("renders The Music eyebrow label", () => {
    render(<MusicSection />);
    expect(screen.getByText(/the music/i)).toBeInTheDocument();
  });

  it("renders the Neural Groove h2 headline", () => {
    render(<MusicSection />);
    expect(screen.getByRole("heading", { level: 2, name: /neural groove/i })).toBeInTheDocument();
  });

  it("renders the Spectrum Divergent sub-label", () => {
    render(<MusicSection />);
    expect(screen.getByText("Spectrum Divergent")).toBeInTheDocument();
  });

  it("renders the Listen Now link pointing to /music", () => {
    render(<MusicSection />);
    const link = screen.getByRole("link", { name: /listen now/i });
    expect(link).toHaveAttribute("href", "/music");
  });

  it("renders the Launch Forge link pointing to /forge", () => {
    render(<MusicSection />);
    const link = screen.getByRole("link", { name: /launch forge/i });
    expect(link).toHaveAttribute("href", "/forge");
  });

  it("renders the body copy about music and emotion", () => {
    render(<MusicSection />);
    expect(screen.getByText(/singing, playing, composing/i)).toBeInTheDocument();
  });

  it("renders the blockquote", () => {
    render(<MusicSection />);
    expect(screen.getByText(/blending instrument riffs/i)).toBeInTheDocument();
  });
});
