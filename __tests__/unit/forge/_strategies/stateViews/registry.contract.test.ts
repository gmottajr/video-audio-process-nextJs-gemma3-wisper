/**
 * Contract test: state-view registry
 * - All AppState values are registered
 * - No duplicates
 * - Missing state throws
 */

// audioExtraction uses ESM; mock it so Jest can load view components
jest.mock("@/utils/audioExtraction", () => ({ extractAudioSegment: jest.fn() }));
jest.mock("@/utils/audioFormats", () => ({ getFormatById: jest.fn() }));
jest.mock("@/utils/videoFormats", () => ({ getVideoFormatById: jest.fn() }));

import { stateViewRegistry, getStateView } from "@/app/forge/_strategies/stateViews/registry";
import type { AppState } from "@/hooks/useAppStateMachine";

const EXPECTED_STATES: AppState[] = ["IDLE", "INSPECT", "PROCESSING", "DONE", "ERROR"];

describe("StateView registry contract", () => {
  test("registers exactly 5 state views", () => {
    expect(stateViewRegistry.size).toBe(5);
  });

  test.each(EXPECTED_STATES)("registers view for state '%s'", (state) => {
    expect(stateViewRegistry.has(state)).toBe(true);
  });

  test("has no duplicate states", () => {
    const states = Array.from(stateViewRegistry.keys());
    expect(new Set(states).size).toBe(states.length);
  });

  test.each(EXPECTED_STATES)("view for '%s' has correct state and render function", (state) => {
    const view = getStateView(state);
    expect(view.state).toBe(state);
    expect(typeof view.render).toBe("function");
  });

  test("getStateView throws for unknown state", () => {
    expect(() => getStateView("UNKNOWN" as AppState)).toThrow();
  });

  test("PROCESSING view renders null (no content area needed)", () => {
    const view = getStateView("PROCESSING");
    const result = view.render({} as never);
    expect(result).toBeNull();
  });
});
