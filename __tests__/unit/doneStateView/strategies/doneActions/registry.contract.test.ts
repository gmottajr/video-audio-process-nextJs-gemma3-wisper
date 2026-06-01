/**
 * OCP Registry Contract: DoneStateView done-action strategies
 *
 * Asserts that:
 * - All 4 strategies are registered with unique IDs
 * - Each satisfies the DoneActionStrategy interface
 * - getDoneButtonStrategies returns exactly the 3 quick-action buttons
 * - getReTranscribeStrategy returns the reTranscribe entry
 */

import {
  getAllDoneActionStrategies,
  getDoneButtonStrategies,
  getReTranscribeStrategy,
} from "@/components/states/DoneStateView/strategies/doneActions/registry";
import type { DoneActionContext } from "@/components/states/DoneStateView/types";

const EXPECTED_IDS = ["download", "stats", "reset", "reTranscribe"] as const;
const EXPECTED_BUTTON_IDS = ["download", "stats", "reset"] as const;

const mockCtx: DoneActionContext = {
  result: { type: "audio", blobUrl: "blob:test", metadata: {} } as any,
  file: new File(["x"], "test.wav", { type: "audio/wav" }),
  format: { name: "WAV" },
  onDownload: jest.fn(),
  onReset: jest.fn(),
  onTranscribe: jest.fn(),
  showStats: false,
  setShowStats: jest.fn(),
  waveformSelection: null,
};

describe("DoneAction registry contract", () => {
  test("getAllDoneActionStrategies returns exactly 4 strategies", () => {
    expect(getAllDoneActionStrategies()).toHaveLength(4);
  });

  test("all strategy IDs are unique", () => {
    const ids = getAllDoneActionStrategies().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("strategy IDs match the expected set", () => {
    const ids = getAllDoneActionStrategies().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([...EXPECTED_IDS]));
  });

  test("each strategy satisfies the DoneActionStrategy interface", () => {
    for (const strategy of getAllDoneActionStrategies()) {
      expect(typeof strategy.id).toBe("string");
      expect(typeof strategy.label).toBe("function");
      // Lucide icons are forwardRef objects in some React builds; accept both
      expect(["function", "object"]).toContain(typeof strategy.icon);
      expect(typeof strategy.isEnabled).toBe("function");
      expect(typeof strategy.onInvoke).toBe("function");
      expect(["primary", "secondary", "accent"]).toContain(strategy.style);
    }
  });

  test("label returns a non-empty string for each strategy", () => {
    for (const strategy of getAllDoneActionStrategies()) {
      const label = strategy.label(mockCtx);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  test("getDoneButtonStrategies returns exactly 3 strategies", () => {
    expect(getDoneButtonStrategies()).toHaveLength(3);
  });

  test("getDoneButtonStrategies IDs are download, stats, reset", () => {
    const ids = getDoneButtonStrategies().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([...EXPECTED_BUTTON_IDS]));
    expect(ids).not.toContain("reTranscribe");
  });

  test("getReTranscribeStrategy returns the reTranscribe strategy", () => {
    expect(getReTranscribeStrategy().id).toBe("reTranscribe");
  });
});
