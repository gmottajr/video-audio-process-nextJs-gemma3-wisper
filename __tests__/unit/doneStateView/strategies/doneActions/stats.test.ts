/**
 * Unit: stats done-action strategy
 */

import stats from "@/components/states/DoneStateView/strategies/doneActions/stats";
import type { DoneActionContext } from "@/components/states/DoneStateView/types";

const base: DoneActionContext = {
  result: { type: "audio", metadata: {} } as any,
  file: new File(["x"], "test.wav", { type: "audio/wav" }),
  format: null,
  onDownload: jest.fn(),
  onReset: jest.fn(),
  showStats: false,
  setShowStats: jest.fn(),
  waveformSelection: null,
};

describe("stats strategy", () => {
  test("id is 'stats'", () => {
    expect(stats.id).toBe("stats");
  });

  test("label returns 'Statistics'", () => {
    expect(stats.label(base)).toBe("Statistics");
  });

  test("isEnabled always true", () => {
    expect(stats.isEnabled(base)).toBe(true);
    expect(stats.isEnabled({ ...base, result: { type: "transcription", metadata: {} } as any })).toBe(true);
  });

  test("onInvoke calls setShowStats(true)", () => {
    const setShowStats = jest.fn();
    stats.onInvoke({ ...base, setShowStats });
    expect(setShowStats).toHaveBeenCalledWith(true);
  });
});
