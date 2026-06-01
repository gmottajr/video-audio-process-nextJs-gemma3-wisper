/**
 * Contract test: action-handler registry
 * - All 4 ActionType values are registered
 * - No duplicates
 * - Each handler satisfies the ActionHandler interface
 */

// audioExtraction uses ESM; mock it so Jest can load the transcribe handler
jest.mock("@/utils/audioExtraction", () => ({
  extractAudioSegment: jest.fn(),
}));

import { actionHandlerRegistry, getActionHandler } from "@/app/forge/_strategies/actionHandlers/registry";
import type { ActionType } from "@/components/ActionSelector";

const EXPECTED_IDS: ActionType[] = ["extract", "convert_audio", "convert_video", "transcribe"];

describe("ActionHandler registry contract", () => {
  test("registers exactly 4 handlers", () => {
    expect(actionHandlerRegistry.size).toBe(4);
  });

  test.each(EXPECTED_IDS)("registers handler for '%s'", (id) => {
    expect(actionHandlerRegistry.has(id)).toBe(true);
  });

  test("has no duplicate ids", () => {
    const ids = Array.from(actionHandlerRegistry.keys());
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(EXPECTED_IDS)("handler '%s' has correct id and handle function", (id) => {
    const handler = getActionHandler(id);
    expect(handler.id).toBe(id);
    expect(typeof handler.handle).toBe("function");
  });

  test("getActionHandler throws for unknown action", () => {
    expect(() => getActionHandler("unknown_action" as ActionType)).toThrow();
  });
});
