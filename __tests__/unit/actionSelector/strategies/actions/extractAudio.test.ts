import "@/components/ActionSelector/index";
import { getActionStrategy } from "@/components/ActionSelector/strategies/actions/registry";
import type { ActionPanelState } from "@/components/ActionSelector/types";

const makeFile = (name: string, type: string) => new File([""], name, { type });

const defaultState: ActionPanelState = {
  selectedAudioFormat: "mp3",
  selectedVideoFormat: "mp4",
  selectedResolution: "original",
  normalizeAudio: false,
  compressionType: "none",
  waveformSelection: null,
  audioDuration: 0,
};

describe("extractAudio strategy", () => {
  const strategy = () => getActionStrategy("extract");

  it("appliesTo video file + extract mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "extract")).toBe(true);
  });

  it("does NOT apply to audio file + extract mode", () => {
    expect(strategy().appliesTo(makeFile("a.mp3", "audio/mp3"), "extract")).toBe(false);
  });

  it("does NOT apply to video file + convert mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "convert")).toBe(false);
  });

  it("isValid always returns true", () => {
    expect(strategy().isValid(defaultState, false, false)).toBe(true);
    expect(strategy().isValid(defaultState, true, true)).toBe(true);
  });

  it("buildOptions returns extract action with audio format and options", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const result = strategy().buildOptions(file, defaultState);
    expect(result.action).toBe("extract");
    expect(result.formatId).toBe("mp3");
    expect(result.options.normalizeAudio).toBe(false);
    expect(result.options.compressionType).toBe("none");
  });

  it("buildOptions includes normalizeAudio and compressionType from state", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const state: ActionPanelState = { ...defaultState, normalizeAudio: true, compressionType: "speech" };
    const result = strategy().buildOptions(file, state);
    expect(result.options.normalizeAudio).toBe(true);
    expect(result.options.compressionType).toBe("speech");
  });

  it("getButtonText returns 'Extract Audio' for plain state", () => {
    expect(strategy().getButtonText(defaultState)).toBe("Extract Audio");
  });

  it("getButtonText returns full-enhancement text when both compression and normalization active", () => {
    const state: ActionPanelState = { ...defaultState, normalizeAudio: true, compressionType: "speech" };
    expect(strategy().getButtonText(state)).toBe("Extract & Process Audio (Full Enhancement)");
  });
});
