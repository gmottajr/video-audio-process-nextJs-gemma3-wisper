import "@/components/ActionSelector/index";
import { getActionStrategy } from "@/components/ActionSelector/strategies/actions/registry";
import type { ActionPanelState } from "@/components/ActionSelector/types";
import type { WaveformSelection } from "@/components/WaveformViewer";

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

describe("transcribe strategy", () => {
  const strategy = () => getActionStrategy("transcribe");

  it("appliesTo video file + transcribe mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "transcribe")).toBe(true);
  });

  it("appliesTo audio file + transcribe mode", () => {
    expect(strategy().appliesTo(makeFile("a.mp3", "audio/mp3"), "transcribe")).toBe(true);
  });

  it("does NOT apply to extract or convert mode", () => {
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "extract")).toBe(false);
    expect(strategy().appliesTo(makeFile("v.mp4", "video/mp4"), "convert")).toBe(false);
  });

  it("isValid returns false when model is loading", () => {
    expect(strategy().isValid(defaultState, false, true)).toBe(false);
  });

  it("isValid returns false when model not loaded and not loading", () => {
    expect(strategy().isValid(defaultState, false, false)).toBe(false);
  });

  it("isValid returns true when model is loaded and not loading", () => {
    expect(strategy().isValid(defaultState, true, false)).toBe(true);
  });

  it("buildOptions returns transcribe action with empty formatId", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const result = strategy().buildOptions(file, defaultState);
    expect(result.action).toBe("transcribe");
    expect(result.formatId).toBe("");
  });

  it("buildOptions includes segment when waveformSelection exists", () => {
    const file = makeFile("a.mp3", "audio/mp3");
    const selection: WaveformSelection = { startTime: 5, endTime: 20, startPercent: 0.1, endPercent: 0.4 };
    const state: ActionPanelState = { ...defaultState, waveformSelection: selection };
    const result = strategy().buildOptions(file, state);
    expect(result.options.segment).toEqual({ startTime: 5, endTime: 20 });
  });

  it("buildOptions does not include segment when no selection", () => {
    const file = makeFile("v.mp4", "video/mp4");
    const result = strategy().buildOptions(file, defaultState);
    expect(result.options.segment).toBeUndefined();
  });

  it("getButtonText shows loading text when model is loading", () => {
    const text = strategy().getButtonText(defaultState, { isModelLoading: true, modelLoadingProgress: 45 });
    expect(text).toContain("45%");
  });

  it("getButtonText shows waiting text when model not loaded", () => {
    const text = strategy().getButtonText(defaultState, { isModelLoaded: false, isModelLoading: false });
    expect(text).toContain("Waiting");
  });

  it("getButtonText shows 'Start AI Transcription' when model loaded and no enhancements", () => {
    const text = strategy().getButtonText(defaultState, { isModelLoaded: true, isModelLoading: false });
    expect(text).toBe("Start AI Transcription");
  });

  it("getButtonText reflects enhancements in text when model loaded", () => {
    const state: ActionPanelState = { ...defaultState, compressionType: "speech" };
    const text = strategy().getButtonText(state, { isModelLoaded: true, isModelLoading: false });
    expect(text).toContain("Speech Compressed");
  });
});
