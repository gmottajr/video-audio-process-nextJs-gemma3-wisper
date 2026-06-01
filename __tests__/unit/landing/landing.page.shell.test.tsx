/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Landing from "@/app/page";

jest.mock("@/lib/pageTransition", () => ({
  pickPageTransition: jest.fn(() => "slide"),
}));

jest.mock("@/components/ScrollScene", () => ({
  ScrollScene: ({ sections, nav }: { sections: React.ReactNode[]; nav: React.ReactNode }) => (
    <div data-testid="scroll-scene">
      <div data-testid="scroll-nav">{nav}</div>
      <div data-testid="scroll-sections">{sections}</div>
    </div>
  ),
}));

// Mock the landing module so section components are lightweight stubs.
// The registry is also mocked so the shell test verifies registry-driven rendering.
jest.mock("@/app/_components/landing", () => ({
  Nav: () => <nav data-testid="landing-nav" />,
  NeuralNetBackgroundWrapper: () => <div data-testid="neural-net-bg" />,
  landingSectionRegistry: [
    { id: "hero",   key: "hero",   Component: () => <div data-testid="section-hero" /> },
    { id: "forge",  key: "forge",  Component: () => <div data-testid="section-forge" /> },
    { id: "stats",  key: "stats",  Component: () => <div data-testid="section-stats" /> },
    { id: "proTip", key: "protip", Component: () => <div data-testid="section-proTip" /> },
    { id: "music",  key: "music",  Component: () => <div data-testid="section-music" /> },
    { id: "footer", key: "footer", Component: () => <div data-testid="section-footer" /> },
  ],
}));

describe("Landing page shell", () => {
  it("renders a main element", () => {
    render(<Landing />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the neural net background wrapper", () => {
    render(<Landing />);
    expect(screen.getByTestId("neural-net-bg")).toBeInTheDocument();
  });

  it("passes Nav to ScrollScene", () => {
    render(<Landing />);
    expect(screen.getByTestId("landing-nav")).toBeInTheDocument();
  });

  it("renders all 6 sections from the registry", () => {
    render(<Landing />);
    expect(screen.getByTestId("section-hero")).toBeInTheDocument();
    expect(screen.getByTestId("section-forge")).toBeInTheDocument();
    expect(screen.getByTestId("section-stats")).toBeInTheDocument();
    expect(screen.getByTestId("section-proTip")).toBeInTheDocument();
    expect(screen.getByTestId("section-music")).toBeInTheDocument();
    expect(screen.getByTestId("section-footer")).toBeInTheDocument();
  });

  it("passes sections to ScrollScene in registry order", () => {
    render(<Landing />);
    const sectionsContainer = screen.getByTestId("scroll-sections");
    const sectionIds = ["hero", "forge", "stats", "proTip", "music", "footer"];
    sectionIds.forEach(id => {
      expect(sectionsContainer).toContainElement(screen.getByTestId(`section-${id}`));
    });
  });

  it("renders the ScrollScene", () => {
    render(<Landing />);
    expect(screen.getByTestId("scroll-scene")).toBeInTheDocument();
  });
});
