/**
 * Shell smoke test: DoneStateView
 *
 * Renders the public-facing DoneStateView with synthetic ProcessingResults and
 * asserts that each major section mounts without crashing. It does NOT assert
 * pixel-level details — those are owned by sub-component tests and regression
 * tests (modelSelectionInDone, transcribeFromDone).
 *
 * @jest-environment jsdom
 */

jest.mock("@/utils/audioExtraction", () => ({
  extractAudioSegmentFromUrl: jest.fn().mockResolvedValue(new Blob(["x"], { type: "audio/wav" })),
}));

jest.mock("@/components/WaveformViewer", () => ({
  WaveformViewer: () => <div data-testid="waveform-viewer" />,
}));

jest.mock("@/components/TranscriptionViewer", () => ({
  TranscriptionViewer: () => <div data-testid="transcription-viewer" />,
}));

jest.mock("@/components/TabbedTranscriptionView", () => ({
  TabbedTranscriptionView: () => <div data-testid="tabbed-transcription-view" />,
}));

jest.mock("@/components/ResourceMonitor", () => ({
  ResourceMonitor: () => <div data-testid="resource-monitor" />,
}));

jest.mock("@/components/MetadataDisplay", () => ({
  MetadataDisplay: () => <div data-testid="metadata-display" />,
}));

jest.mock("@/components/StatisticsModal", () => ({
  StatisticsModal: () => <div data-testid="statistics-modal" />,
}));

jest.mock("@/contexts/EnhancerContext", () => ({
  useEnhancerContextOptional: () => null,
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DoneStateView } from "@/components/states/DoneStateView";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

const mockFile = new File(["x"], "test.wav", { type: "audio/wav" });

const baseProps = {
  file: mockFile,
  formatId: "wav",
  selectedModelKey: "base" as const,
  currentModel: null,
  metrics: { duration: 60 },
  memoryUsageMB: 100,
  onDownload: jest.fn(),
  onReset: jest.fn(),
  isModelLoaded: true,
  isModelLoading: false,
};

describe("DoneStateView shell smoke", () => {
  test("renders success strip for audio result", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} />);
    expect(screen.getByText("Audio ready")).toBeInTheDocument();
  });

  test("renders WaveformViewer for audio result with blobUrl", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} />);
    expect(screen.getByTestId("waveform-viewer")).toBeInTheDocument();
  });

  test("renders success strip for video result", () => {
    const result: ProcessingResult = { type: "video", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} formatId="mp4" />);
    expect(screen.getByText("Video ready")).toBeInTheDocument();
  });

  test("renders video element for video result", () => {
    const result: ProcessingResult = { type: "video", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} formatId="mp4" />);
    expect(screen.getByTestId("metadata-display")).toBeInTheDocument();
  });

  test("renders TranscriptionViewer for transcription result without enhancement", () => {
    const result: ProcessingResult = {
      type: "transcription",
      transcription: { text: "hello", chunks: [] },
      metadata: {},
    };
    render(<DoneStateView {...baseProps} result={result} currentModel="whisper-base" />);
    expect(screen.getByText("Transcription complete")).toBeInTheDocument();
    expect(screen.getByTestId("transcription-viewer")).toBeInTheDocument();
  });

  test("renders Statistics button", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} />);
    expect(screen.getByText("Statistics")).toBeInTheDocument();
  });

  test("renders Process another button", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} />);
    expect(screen.getByText("Process another")).toBeInTheDocument();
  });

  test("renders TranscribeFromDoneForm for audio result with onTranscribe", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(
      <DoneStateView
        {...baseProps}
        result={result}
        onTranscribe={jest.fn()}
      />
    );
    // TranscribeFromDoneForm renders "Transcribe This Audio" via TranscriptionFormHeader
    expect(screen.getByText("Transcribe This Audio")).toBeInTheDocument();
  });

  test("does NOT render TranscribeFromDoneForm for transcription result", () => {
    const result: ProcessingResult = {
      type: "transcription",
      transcription: { text: "hello", chunks: [] },
      metadata: {},
    };
    render(
      <DoneStateView {...baseProps} result={result} currentModel="whisper-base" onTranscribe={jest.fn()} />
    );
    expect(screen.queryByText("Transcribe This Audio")).not.toBeInTheDocument();
  });

  test("renders FileMetaCard for audio result", () => {
    const result: ProcessingResult = { type: "audio", blobUrl: "blob:test", metadata: {} };
    render(<DoneStateView {...baseProps} result={result} />);
    expect(screen.getByText("File Information")).toBeInTheDocument();
  });
});
