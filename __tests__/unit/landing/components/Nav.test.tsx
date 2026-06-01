/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Nav } from "@/app/_components/landing/components/Nav";

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

describe("Nav", () => {
  it("renders the Neural Groove brand name", () => {
    render(<Nav />);
    expect(screen.getByText("Neural Groove")).toBeInTheDocument();
  });

  it("renders the Spectrum Divergent sub-label", () => {
    render(<Nav />);
    expect(screen.getByText("Spectrum Divergent")).toBeInTheDocument();
  });

  it("renders the Launch Forge link pointing to /forge", () => {
    render(<Nav />);
    const link = screen.getByRole("link", { name: /launch forge/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/forge");
  });

  it("renders the branding logo image", () => {
    render(<Nav />);
    expect(screen.getByAltText("Neural Groove")).toBeInTheDocument();
  });
});
