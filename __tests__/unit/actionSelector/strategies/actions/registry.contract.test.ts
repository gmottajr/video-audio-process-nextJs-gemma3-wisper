// Import index to trigger side-effect registrations
import "@/components/ActionSelector/index";
import {
  getActionStrategy,
  getAvailableStrategy,
} from "@/components/ActionSelector/strategies/actions/registry";
import type { ActionType } from "@/components/ActionSelector/types";

const EXPECTED_IDS: ActionType[] = ["extract", "convert_audio", "convert_video", "transcribe"];

const makeFile = (name: string, type: string) =>
  new File([""], name, { type });

describe("ActionStrategy registry contract", () => {
  it("has exactly 4 strategies registered", () => {
    const retrieved = EXPECTED_IDS.map((id) => getActionStrategy(id));
    expect(retrieved).toHaveLength(4);
  });

  it("each expected id is retrievable without throwing", () => {
    for (const id of EXPECTED_IDS) {
      expect(() => getActionStrategy(id)).not.toThrow();
    }
  });

  it("throws for an unknown id", () => {
    expect(() => getActionStrategy("__nonexistent__" as ActionType)).toThrow();
  });

  it("each strategy implements the interface (has Panel, buildOptions, isValid, appliesTo)", () => {
    for (const id of EXPECTED_IDS) {
      const s = getActionStrategy(id);
      expect(typeof s.appliesTo).toBe("function");
      expect(typeof s.buildOptions).toBe("function");
      expect(typeof s.isValid).toBe("function");
      expect(typeof s.getButtonText).toBe("function");
      expect(typeof s.getHintText).toBe("function");
      expect(s.Panel).toBeDefined();
    }
  });

  it("getAvailableStrategy returns extract strategy for video file + extract mode", () => {
    const videoFile = makeFile("clip.mp4", "video/mp4");
    const strategy = getAvailableStrategy(videoFile, "extract");
    expect(strategy?.id).toBe("extract");
  });

  it("getAvailableStrategy returns convert_video strategy for video file + convert mode", () => {
    const videoFile = makeFile("clip.mp4", "video/mp4");
    const strategy = getAvailableStrategy(videoFile, "convert");
    expect(strategy?.id).toBe("convert_video");
  });

  it("getAvailableStrategy returns transcribe strategy for video file + transcribe mode", () => {
    const videoFile = makeFile("clip.mp4", "video/mp4");
    const strategy = getAvailableStrategy(videoFile, "transcribe");
    expect(strategy?.id).toBe("transcribe");
  });

  it("getAvailableStrategy returns convert_audio strategy for audio file (any videoMode)", () => {
    const audioFile = makeFile("song.mp3", "audio/mp3");
    const strategy = getAvailableStrategy(audioFile, "extract");
    expect(strategy?.id).toBe("convert_audio");
  });

  it("getAvailableStrategy returns transcribe strategy for audio file + transcribe mode", () => {
    const audioFile = makeFile("song.mp3", "audio/mp3");
    const strategy = getAvailableStrategy(audioFile, "transcribe");
    expect(strategy?.id).toBe("transcribe");
  });
});
