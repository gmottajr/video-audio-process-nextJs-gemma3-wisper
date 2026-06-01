/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ForgeSection } from "@/app/_components/landing/components/ForgeSection";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  Video: () => <svg data-testid="icon-video" />,
  Music: () => <svg data-testid="icon-music" />,
  Mic: () => <svg data-testid="icon-mic" />,
}));

describe("ForgeSection", () => {
  it("renders The Forge section heading", () => {
    render(<ForgeSection />);
    expect(screen.getByRole("heading", { name: /the forge/i })).toBeInTheDocument();
  });

  it("renders all three feature card titles", () => {
    render(<ForgeSection />);
    expect(screen.getByText("Video Processing")).toBeInTheDocument();
    expect(screen.getByText("Audio Conversion")).toBeInTheDocument();
    expect(screen.getByText("AI Transcription")).toBeInTheDocument();
  });

  it("renders feature card descriptions", () => {
    render(<ForgeSection />);
    expect(screen.getByText(/convert & extract audio/i)).toBeInTheDocument();
    expect(screen.getByText(/convert formats, compress/i)).toBeInTheDocument();
    expect(screen.getByText(/speech-to-text/i)).toBeInTheDocument();
  });

  it("renders feature card format tags", () => {
    render(<ForgeSection />);
    expect(screen.getByText(/MP4 · MKV/)).toBeInTheDocument();
    expect(screen.getByText(/WAV · MP3/)).toBeInTheDocument();
    expect(screen.getByText(/Word timestamps/)).toBeInTheDocument();
  });

  it("renders the Open the Forge bottom CTA", () => {
    render(<ForgeSection />);
    expect(screen.getByRole("link", { name: /open the forge/i })).toBeInTheDocument();
  });

  it("renders badge labels for each feature", () => {
    render(<ForgeSection />);
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });
});
