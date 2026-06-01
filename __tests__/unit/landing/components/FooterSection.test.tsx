/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FooterSection } from "@/app/_components/landing/components/FooterSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  ),
}));

describe("FooterSection", () => {
  it("renders the Neural Groove brand name", () => {
    render(<FooterSection />);
    expect(screen.getByText("Neural Groove")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<FooterSection />);
    expect(screen.getByText(/browser-native tools/i)).toBeInTheDocument();
  });

  it("renders the zero-trace copy", () => {
    render(<FooterSection />);
    expect(screen.getByText(/zero uploads · zero traces/i)).toBeInTheDocument();
  });

  it("renders the Launch Forge link pointing to /forge", () => {
    render(<FooterSection />);
    const link = screen.getByRole("link", { name: /launch forge/i });
    expect(link).toHaveAttribute("href", "/forge");
  });

  it("renders The Music link pointing to /music", () => {
    render(<FooterSection />);
    const link = screen.getByRole("link", { name: /the music/i });
    expect(link).toHaveAttribute("href", "/music");
  });

  it("renders the branding logo image", () => {
    render(<FooterSection />);
    expect(screen.getByAltText("Neural Groove")).toBeInTheDocument();
  });
});
