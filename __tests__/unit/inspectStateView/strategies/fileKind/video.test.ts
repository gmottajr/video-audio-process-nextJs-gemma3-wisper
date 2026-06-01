import { videoFileKind } from "@/components/states/InspectStateView/strategies/fileKind/video";

describe("videoFileKind strategy", () => {
  it("kind is 'video'", () => {
    expect(videoFileKind.kind).toBe("video");
  });

  it("detects video/mp4", () => {
    expect(videoFileKind.detect(new File([""], "f.mp4", { type: "video/mp4" }))).toBe(true);
  });

  it("detects video/webm", () => {
    expect(videoFileKind.detect(new File([""], "f.webm", { type: "video/webm" }))).toBe(true);
  });

  it("does not detect audio/mpeg", () => {
    expect(videoFileKind.detect(new File([""], "f.mp3", { type: "audio/mpeg" }))).toBe(false);
  });

  it("defaultActionTile is 'extract'", () => {
    expect(videoFileKind.defaultActionTile).toBe("extract");
  });

  it("availableActions includes extract, convert, transcribe", () => {
    expect(videoFileKind.availableActions).toContain("extract");
    expect(videoFileKind.availableActions).toContain("convert");
    expect(videoFileKind.availableActions).toContain("transcribe");
  });

  it("icon is a valid React component", () => {
    expect(videoFileKind.icon).toBeTruthy();
  });
});
