/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useProcessorResultSync } from "@/app/forge/_hooks/useProcessorResultSync";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

const TRANSCRIPTION_RESULT: ProcessingResult = {
  type: "transcription",
  transcription: { text: "hello", chunks: [] },
};

const AUDIO_RESULT: ProcessingResult = {
  type: "audio",
  blobUrl: "blob:1",
};

describe("useProcessorResultSync", () => {
  test("calls completeProcessing when transcription result arrives in PROCESSING+transcribe", () => {
    const completeProcessing = jest.fn();
    const failProcessing = jest.fn();

    renderHook(() =>
      useProcessorResultSync({
        processorResult: TRANSCRIPTION_RESULT,
        processorError: null,
        state: "PROCESSING",
        currentAction: "transcribe",
        completeProcessing,
        failProcessing,
      })
    );

    expect(completeProcessing).toHaveBeenCalledWith(TRANSCRIPTION_RESULT);
  });

  test("does not call completeProcessing for non-transcription result", () => {
    const completeProcessing = jest.fn();
    renderHook(() =>
      useProcessorResultSync({
        processorResult: AUDIO_RESULT,
        processorError: null,
        state: "PROCESSING",
        currentAction: "extract",
        completeProcessing,
        failProcessing: jest.fn(),
      })
    );
    expect(completeProcessing).not.toHaveBeenCalled();
  });

  test("does not call completeProcessing when state is not PROCESSING", () => {
    const completeProcessing = jest.fn();
    renderHook(() =>
      useProcessorResultSync({
        processorResult: TRANSCRIPTION_RESULT,
        processorError: null,
        state: "DONE",
        currentAction: "transcribe",
        completeProcessing,
        failProcessing: jest.fn(),
      })
    );
    expect(completeProcessing).not.toHaveBeenCalled();
  });

  test("calls failProcessing when processorError arrives in PROCESSING", () => {
    const failProcessing = jest.fn();
    renderHook(() =>
      useProcessorResultSync({
        processorResult: null,
        processorError: "Something went wrong",
        state: "PROCESSING",
        currentAction: "transcribe",
        completeProcessing: jest.fn(),
        failProcessing,
      })
    );
    expect(failProcessing).toHaveBeenCalledWith("Something went wrong");
  });

  test("does not call failProcessing when state is not PROCESSING", () => {
    const failProcessing = jest.fn();
    renderHook(() =>
      useProcessorResultSync({
        processorResult: null,
        processorError: "error",
        state: "IDLE",
        currentAction: null,
        completeProcessing: jest.fn(),
        failProcessing,
      })
    );
    expect(failProcessing).not.toHaveBeenCalled();
  });
});
