import { fileKindStrategies, getFileKindStrategy, detectKind } from "@/components/states/InspectStateView/strategies/fileKind/registry";

describe("fileKind registry contract", () => {
  it("has exactly 3 strategies registered", () => {
    expect(fileKindStrategies).toHaveLength(3);
  });

  it("has no duplicate kinds", () => {
    const kinds = fileKindStrategies.map((s) => s.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("each strategy satisfies the interface", () => {
    for (const s of fileKindStrategies) {
      expect(typeof s.kind).toBe("string");
      expect(typeof s.detect).toBe("function");
      expect(["extract", "convert", "transcribe"]).toContain(s.defaultActionTile);
      expect(Array.isArray(s.availableActions)).toBe(true);
      expect(s.icon).toBeTruthy(); // forwardRef icons are objects, not plain functions
    }
  });

  it("getFileKindStrategy returns 'audio' for audio MIME types", () => {
    const file = new File([""], "test.mp3", { type: "audio/mpeg" });
    expect(getFileKindStrategy(file).kind).toBe("audio");
  });

  it("getFileKindStrategy returns 'video' for video MIME types", () => {
    const file = new File([""], "test.mp4", { type: "video/mp4" });
    expect(getFileKindStrategy(file).kind).toBe("video");
  });

  it("getFileKindStrategy returns 'unknown' for unrecognized MIME types", () => {
    const file = new File([""], "test.pdf", { type: "application/pdf" });
    expect(getFileKindStrategy(file).kind).toBe("unknown");
  });

  it("detectKind extracts the kind field correctly", () => {
    const audio = new File([""], "a.wav", { type: "audio/wav" });
    const video = new File([""], "v.mp4", { type: "video/mp4" });
    const other = new File([""], "f.txt", { type: "text/plain" });
    expect(detectKind(audio)).toBe("audio");
    expect(detectKind(video)).toBe("video");
    expect(detectKind(other)).toBe("unknown");
  });
});
