/**
 * Unit: useSegmentExtraction hook
 * @jest-environment jsdom
 */

jest.mock("@/utils/audioExtraction", () => ({
  extractAudioSegmentFromUrl: jest.fn(),
}));

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useSegmentExtraction } from "@/components/states/DoneStateView/hooks/useSegmentExtraction";
import { extractAudioSegmentFromUrl } from "@/utils/audioExtraction";

const mockExtract = extractAudioSegmentFromUrl as jest.MockedFunction<typeof extractAudioSegmentFromUrl>;

const makeProps = (overrides: object = {}) => ({
  result: { type: "audio", blobUrl: "blob:test", metadata: {} } as any,
  file: new File(["x"], "test.wav", { type: "audio/wav" }),
  metrics: { duration: 100 },
  selectedModelKey: "base" as const,
  onTranscribe: jest.fn(),
  ...overrides,
});

describe("useSegmentExtraction", () => {
  beforeEach(() => {
    mockExtract.mockResolvedValue(new Blob(["seg"], { type: "audio/wav" }));
  });

  afterEach(() => jest.clearAllMocks());

  test("initial state: waveformSelection is null", () => {
    const { result } = renderHook(() => useSegmentExtraction(makeProps()));
    expect(result.current.waveformSelection).toBeNull();
  });

  test("setWaveformSelection updates waveformSelection", () => {
    const { result } = renderHook(() => useSegmentExtraction(makeProps()));
    act(() => {
      result.current.setWaveformSelection({ startTime: 1, endTime: 5 } as any);
    });
    expect(result.current.waveformSelection).toEqual({ startTime: 1, endTime: 5 });
  });

  test("segmentCompressionType initial value is 'none'", () => {
    const { result } = renderHook(() => useSegmentExtraction(makeProps()));
    expect(result.current.segmentCompressionType).toBe("none");
  });

  test("handleTranscribeSegment is a no-op when waveformSelection is null", async () => {
    const onTranscribe = jest.fn();
    const { result } = renderHook(() => useSegmentExtraction(makeProps({ onTranscribe })));
    await act(async () => {
      await result.current.handleTranscribeSegment();
    });
    expect(onTranscribe).not.toHaveBeenCalled();
  });

  test("handleTranscribeSegment extracts segment and calls onTranscribe", async () => {
    const onTranscribe = jest.fn();
    const { result } = renderHook(() => useSegmentExtraction(makeProps({ onTranscribe })));
    act(() => {
      result.current.setWaveformSelection({ startTime: 2, endTime: 8 } as any);
    });
    await act(async () => {
      await result.current.handleTranscribeSegment();
    });
    expect(mockExtract).toHaveBeenCalledWith("blob:test", 2, 8);
    expect(onTranscribe).toHaveBeenCalled();
    // selection cleared after successful extraction
    expect(result.current.waveformSelection).toBeNull();
  });

  test("handleTranscribeSegment sets extractionError on failure", async () => {
    mockExtract.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSegmentExtraction(makeProps()));
    act(() => {
      result.current.setWaveformSelection({ startTime: 2, endTime: 8 } as any);
    });
    await act(async () => {
      await result.current.handleTranscribeSegment();
    });
    expect(result.current.extractionError).toBe("boom");
    expect(result.current.isExtractingSegment).toBe(false);
  });

  test("getSegmentResources returns null when waveformSelection is null", () => {
    const { result } = renderHook(() => useSegmentExtraction(makeProps()));
    expect(result.current.getSegmentResources()).toBeNull();
  });
});
