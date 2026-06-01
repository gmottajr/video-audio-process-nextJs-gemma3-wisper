/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { CapabilityStatTiles } from "@/components/states/InspectStateView/components/CapabilityStatTiles";
import type { DetectedCaps } from "@/components/states/InspectStateView/types";

const caps: DetectedCaps = {
  cpuThreads: 12,
  gpu: true,
  gpuDevice: "RTX 4090",
  ramGB: 32,
  recommendedWorkers: 4,
  maxWorkers: 8,
};

describe("CapabilityStatTiles", () => {
  it("shows CPU thread count when caps available", () => {
    render(<CapabilityStatTiles caps={caps} workers={4} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("CPU threads")).toBeInTheDocument();
  });

  it("shows GPU ready when gpu is true", () => {
    render(<CapabilityStatTiles caps={caps} workers={4} />);
    expect(screen.getByText("GPU ready")).toBeInTheDocument();
  });

  it("shows CPU only when gpu is false", () => {
    const noGpu: DetectedCaps = { ...caps, gpu: false };
    render(<CapabilityStatTiles caps={noGpu} workers={4} />);
    expect(screen.getByText("CPU only")).toBeInTheDocument();
  });

  it("shows RAM in GB", () => {
    render(<CapabilityStatTiles caps={caps} workers={4} />);
    expect(screen.getByText("GB RAM")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
  });

  it("shows worker count", () => {
    render(<CapabilityStatTiles caps={caps} workers={6} />);
    expect(screen.getByText("Workers")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("shows dashes when caps is null", () => {
    render(<CapabilityStatTiles caps={null} workers={0} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});
