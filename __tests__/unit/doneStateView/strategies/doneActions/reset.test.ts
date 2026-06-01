/**
 * Unit: reset done-action strategy
 */

import reset from "@/components/states/DoneStateView/strategies/doneActions/reset";
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

describe("reset strategy", () => {
  test("id is 'reset'", () => {
    expect(reset.id).toBe("reset");
  });

  test("label returns 'Process another'", () => {
    expect(reset.label(base)).toBe("Process another");
  });

  test("isEnabled always true", () => {
    expect(reset.isEnabled(base)).toBe(true);
  });

  test("onInvoke calls onReset", () => {
    const onReset = jest.fn();
    reset.onInvoke({ ...base, onReset });
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
