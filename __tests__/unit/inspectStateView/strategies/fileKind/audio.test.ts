import { audioFileKind } from "@/components/states/InspectStateView/strategies/fileKind/audio";

describe("audioFileKind strategy", () => {
  it("kind is 'audio'", () => {
    expect(audioFileKind.kind).toBe("audio");
  });

  it("detects audio/mpeg", () => {
    expect(audioFileKind.detect(new File([""], "f.mp3", { type: "audio/mpeg" }))).toBe(true);
  });

  it("detects audio/wav", () => {
    expect(audioFileKind.detect(new File([""], "f.wav", { type: "audio/wav" }))).toBe(true);
  });

  it("does not detect video/mp4", () => {
    expect(audioFileKind.detect(new File([""], "f.mp4", { type: "video/mp4" }))).toBe(false);
  });

  it("defaultActionTile is 'convert'", () => {
    expect(audioFileKind.defaultActionTile).toBe("convert");
  });

  it("availableActions includes convert and transcribe", () => {
    expect(audioFileKind.availableActions).toContain("convert");
    expect(audioFileKind.availableActions).toContain("transcribe");
    expect(audioFileKind.availableActions).not.toContain("extract");
  });

  it("icon is a valid React component", () => {
    expect(audioFileKind.icon).toBeTruthy();
  });
});
