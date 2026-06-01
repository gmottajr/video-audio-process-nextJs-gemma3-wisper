/**
 * Unit: useResultStats hook
 */

import { useResultStats } from "@/components/states/DoneStateView/hooks/useResultStats";

// Pure logic — no React rendering needed
function invoke(args: Parameters<typeof useResultStats>[0]) {
  return useResultStats(args);
}

describe("useResultStats", () => {
  test("returns null elapsedStr when no timing props", () => {
    const result = { type: "audio", metadata: {} } as any;
    const { elapsedStr } = invoke({ result });
    expect(elapsedStr).toBeNull();
  });

  test("formats elapsed seconds correctly (< 60s)", () => {
    const result = { type: "audio", metadata: {} } as any;
    const { elapsedStr } = invoke({ result, processingStartTime: 1000, processingEndTime: 46_000 });
    expect(elapsedStr).toBe("45s");
  });

  test("formats elapsed correctly (> 60s)", () => {
    const result = { type: "audio", metadata: {} } as any;
    const { elapsedStr } = invoke({ result, processingStartTime: 1000, processingEndTime: 126_000 });
    expect(elapsedStr).toBe("2m 05s");
  });

  test("returns charCount for transcription result", () => {
    const result = {
      type: "transcription",
      transcription: { text: "hello world", chunks: [] },
      metadata: {},
    } as any;
    const { charCount } = invoke({ result });
    expect(charCount).toBe(11);
  });

  test("returns null charCount for audio result", () => {
    const result = { type: "audio", metadata: {} } as any;
    const { charCount } = invoke({ result });
    expect(charCount).toBeNull();
  });

  test("clamps elapsed to minimum 1s", () => {
    const result = { type: "audio", metadata: {} } as any;
    // start and end are equal → raw elapsed = 0 → clamped to 1
    const { elapsedStr } = invoke({ result, processingStartTime: 1000, processingEndTime: 1000 });
    expect(elapsedStr).toBe("1s");
  });
});
