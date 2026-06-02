/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkerErrorBanner } from "@/components/states/InspectStateView/components/WorkerErrorBanner";

describe("WorkerErrorBanner", () => {
  it("renders the error message", () => {
    render(<WorkerErrorBanner error="COEP policy blocked the worker script." />);
    expect(screen.getByText("COEP policy blocked the worker script.")).toBeInTheDocument();
  });

  it("always renders the heading", () => {
    render(<WorkerErrorBanner error="some error" />);
    expect(screen.getByText("Transcription worker failed to start")).toBeInTheDocument();
  });

  it("renders the Retry button when onRetry is provided", () => {
    render(<WorkerErrorBanner error="err" onRetry={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("does not render the Retry button when onRetry is absent", () => {
    render(<WorkerErrorBanner error="err" />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked", () => {
    const onRetry = jest.fn();
    render(<WorkerErrorBanner error="err" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("always renders the Hard refresh button", () => {
    render(<WorkerErrorBanner error="err" />);
    expect(screen.getByRole("button", { name: "Hard refresh" })).toBeInTheDocument();
  });
});
