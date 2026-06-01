/**
 * Unit: reTranscribe done-action strategy
 */

import reTranscribe from "@/components/states/DoneStateView/strategies/doneActions/reTranscribe";
import type { DoneActionContext } from "@/components/states/DoneStateView/types";

const audioCtx: DoneActionContext = {
  result: { type: "audio", blobUrl: "blob:test", metadata: {} } as any,
  file: new File(["x"], "test.wav", { type: "audio/wav" }),
  format: null,
  onDownload: jest.fn(),
  onReset: jest.fn(),
  onTranscribe: jest.fn(),
  showStats: false,
  setShowStats: jest.fn(),
  waveformSelection: null,
};

describe("reTranscribe strategy", () => {
  test("id is 'reTranscribe'", () => {
    expect(reTranscribe.id).toBe("reTranscribe");
  });

  test("isEnabled true for audio result with onTranscribe and no selection", () => {
    expect(reTranscribe.isEnabled(audioCtx)).toBe(true);
  });

  test("isEnabled false for video result", () => {
    expect(
      reTranscribe.isEnabled({
        ...audioCtx,
        result: { type: "video", blobUrl: "blob:test", metadata: {} } as any,
      })
    ).toBe(false);
  });

  test("isEnabled false for transcription result", () => {
    expect(
      reTranscribe.isEnabled({
        ...audioCtx,
        result: { type: "transcription", metadata: {} } as any,
      })
    ).toBe(false);
  });

  test("isEnabled false when onTranscribe is not provided", () => {
    expect(reTranscribe.isEnabled({ ...audioCtx, onTranscribe: undefined })).toBe(false);
  });

  test("isEnabled false when waveformSelection is active", () => {
    expect(
      reTranscribe.isEnabled({
        ...audioCtx,
        waveformSelection: { startTime: 1, endTime: 3 } as any,
      })
    ).toBe(false);
  });

  test("onInvoke does not throw", () => {
    expect(() => reTranscribe.onInvoke(audioCtx)).not.toThrow();
  });
});
