import "@/components/ActionSelector/index";
import { getActionStrategy } from "@/components/ActionSelector/strategies/actions/registry";
import type { ActionPanelState } from "@/components/ActionSelector/types";
import type { WaveformSelection } from "@/components/WaveformViewer";

const makeFile = (name: string, type: string) => new File([""], name, { type });

const defaultState: ActionPanelState = {
  selectedAudioFormat: "wav",
  selectedVideoFormat: "mp4",
  selectedResolution: "original",
  normalizeAudio: false,
  compressionType: "none",
  waveformSelection: null,
  audioDuration: 0,
};

describe("convertAudio strategy", () => {
  const strategy = () => getActionStrategy("convert_audio");

  it("appliesTo audio file (any videoMode)", () => {
    expect(strategy().appliesTo(makeFile("a.mp3", "audio/mp3"), "extract")).toBe(true);
    expect(strategy().appliesTo(makeFile("a.wav", "audio/wav"), "convert")).toBe(true);
  });

  it("does NOT apply to video file", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "extract")).toBe(false);
  });

  it("isValid always returns true", () => {
    expect(strategy().isValid(defaultState, false, false)).toBe(true);
  });

  it("buildOptions returns convert_audio with no segment when no selection", () => {
    const file = makeFile("a.mp3", "audio/mp3");
    const result = strategy().buildOptions(file, defaultState);
    expect(result.action).toBe("convert_audio");
    expect(result.formatId).toBe("wav");
    expect(result.options.segment).toBeUndefined();
  });

  it("buildOptions includes segment when waveformSelection exists", () => {
    const file = makeFile("a.mp3", "audio/mp3");
    const selection: WaveformSelection = { startTime: 10, endTime: 30, startPercent: 0.2, endPercent: 0.6 };
    const state: ActionPanelState = { ...defaultState, waveformSelection: selection };
    const result = strategy().buildOptions(file, state);
    expect(result.options.segment).toEqual({ startTime: 10, endTime: 30 });
  });

  it("getButtonText returns 'Convert to WAV' for plain state", () => {
    const text = strategy().getButtonText(defaultState, { selectedFormatName: "WAV" });
    expect(text).toBe("Convert to WAV");
  });

  it("getButtonText includes segment suffix when waveformSelection exists", () => {
    const selection: WaveformSelection = { startTime: 5, endTime: 15, startPercent: 0.1, endPercent: 0.3 };
    const state: ActionPanelState = { ...defaultState, waveformSelection: selection };
    const text = strategy().getButtonText(state, { selectedFormatName: "MP3" });
    expect(text).toContain("Segment");
  });
});
