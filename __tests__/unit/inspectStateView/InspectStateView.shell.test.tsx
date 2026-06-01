/**
 * Shell smoke test: InspectStateView
 *
 * Renders InspectStateView with audio and video files and asserts that each
 * major section mounts. Does not assert pixel details — those belong to
 * sub-component tests and the Phase 6 regression suites.
 *
 * @jest-environment jsdom
 */

jest.mock("@/utils/systemCapabilities", () => ({
  detectSystemCapabilities: jest.fn().mockResolvedValue({
    cpu: { threads: 8, cores: 4 },
    gpu: { webgpuSupported: true, device: "RTX 4090" },
    memory: { totalGB: 32, availableGB: 16 },
    browser: { name: "Chrome", version: "120" },
    npu: { available: false, webnnSupported: false },
  }),
  calculateOptimalWorkers: jest.fn().mockReturnValue({
    recommendedWorkers: 4,
    maxWorkers: 8,
    useGPU: true,
    preferredDevice: "gpu",
    reasoning: [],
    memoryBudgetMB: 2200,
  }),
}));

jest.mock("@/components/ActionSelector", () => ({
  ActionSelector: React.forwardRef((_props: any, _ref: any) => (
    <div data-testid="action-selector" />
  )),
}));

jest.mock("@/components/MediaPreview", () => ({
  MediaPreview: () => <div data-testid="media-preview" />,
}));

jest.mock("@/components/MetadataDisplay", () => ({
  MetadataDisplay: () => <div data-testid="metadata-display" />,
}));

jest.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: jest.fn().mockReturnValue(false),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InspectStateView } from "@/components/states/InspectStateView";

const makeFile = (name: string, type: string) => new File([""], name, { type });
const noop = jest.fn();

const baseProps = {
  metrics: {},
  selectedModelKey: "base" as const,
  currentModel: null,
  isModelLoading: false,
  isTranscribing: false,
  onModelSelect: noop,
  transcriptionMode: "standard" as const,
  onModeChange: noop,
  onAction: noop,
  onBack: noop,
  isFFmpegLoaded: true,
  isFFmpegLoading: false,
  isModelLoaded: true,
  modelLoadingProgress: 0,
};

describe("InspectStateView shell smoke", () => {
  it("renders action tiles for an audio file", () => {
    render(<InspectStateView {...baseProps} file={makeFile("song.mp3", "audio/mpeg")} />);
    // "Convert format" appears in both ActionTiles tile and FloatingActionBar CTA
    expect(screen.getAllByText("Convert format").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("AI transcription")).toBeInTheDocument();
    expect(screen.queryByText("Extract audio")).not.toBeInTheDocument();
  });

  it("renders action tiles for a video file", () => {
    render(<InspectStateView {...baseProps} file={makeFile("clip.mp4", "video/mp4")} />);
    // "Extract audio" appears in both ActionTiles tile and FloatingActionBar CTA
    expect(screen.getAllByText("Extract audio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Convert container")).toBeInTheDocument();
    expect(screen.getByText("AI transcription")).toBeInTheDocument();
  });

  it("renders the AI model section", () => {
    render(<InspectStateView {...baseProps} file={makeFile("song.mp3", "audio/mpeg")} />);
    expect(screen.getByText("AI model")).toBeInTheDocument();
    expect(screen.getByText("Tiny")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
  });

  it("renders system capabilities section", () => {
    render(<InspectStateView {...baseProps} file={makeFile("song.mp3", "audio/mpeg")} />);
    expect(screen.getByText("System capabilities")).toBeInTheDocument();
    expect(screen.getByText("CPU threads")).toBeInTheDocument();
  });

  it("renders ActionSelector component", () => {
    render(<InspectStateView {...baseProps} file={makeFile("clip.mp4", "video/mp4")} />);
    expect(screen.getByTestId("action-selector")).toBeInTheDocument();
  });

  it("renders preview pane", () => {
    render(<InspectStateView {...baseProps} file={makeFile("clip.mp4", "video/mp4")} />);
    expect(screen.getByTestId("media-preview")).toBeInTheDocument();
  });

  it("renders file information card", () => {
    render(<InspectStateView {...baseProps} file={makeFile("clip.mp4", "video/mp4")} />);
    expect(screen.getByText("File information")).toBeInTheDocument();
    expect(screen.getByTestId("metadata-display")).toBeInTheDocument();
  });

  it("shows FFmpeg banner when not loaded", () => {
    render(
      <InspectStateView
        {...baseProps}
        file={makeFile("clip.mp4", "video/mp4")}
        isFFmpegLoaded={false}
        isFFmpegLoading
      />
    );
    expect(screen.getByText("Initializing processing engine…")).toBeInTheDocument();
  });

  it("renders file name in the strip", () => {
    render(<InspectStateView {...baseProps} file={makeFile("my-video.mp4", "video/mp4")} />);
    expect(screen.getByText("my-video.mp4")).toBeInTheDocument();
  });

  it("does not show action tiles for unknown MIME type", () => {
    render(
      <InspectStateView {...baseProps} file={makeFile("data.bin", "application/octet-stream")} />
    );
    expect(screen.queryByText("Step 02 · Choose action")).not.toBeInTheDocument();
  });
});
