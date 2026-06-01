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

describe("convertVideo strategy", () => {
  const strategy = () => getActionStrategy("convert_video");

  it("appliesTo video file + convert mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "convert")).toBe(true);
  });

  it("does NOT apply to video file + extract mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "extract")).toBe(false);
  });

  it("does NOT apply to audio file", () => {
    expect(strategy().appliesTo(makeFile("a.mp3", "audio/mp3"), "convert")).toBe(false);
  });

  it("isValid always returns true", () => {
    expect(strategy().isValid(defaultState, false, false)).toBe(true);
  });

  it("buildOptions returns convert_video with resolutionId", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const result = strategy().buildOptions(file, defaultState);
    expect(result.action).toBe("convert_video");
    expect(result.formatId).toBe("mp4");
    expect(result.options.resolutionId).toBe("original");
  });

  it("buildOptions uses selectedResolution from state", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const state: ActionPanelState = { ...defaultState, selectedResolution: "1080p" };
    const result = strategy().buildOptions(file, state);
    expect(result.options.resolutionId).toBe("1080p");
  });

  it("getButtonText returns 'Convert to {format}'", () => {
    const text = strategy().getButtonText(defaultState, { selectedFormatName: "WebM" });
    expect(text).toBe("Convert to WebM");
  });

  it("getHintText returns remux message when willRemux is true", () => {
    const text = strategy().getHintText(defaultState, { willRemux: true });
    expect(text).toContain("remux");
  });

  it("getHintText returns FFmpeg message when not remuxing", () => {
    const text = strategy().getHintText(defaultState, { willRemux: false });
    expect(text).toContain("FFmpeg");
  });
});
