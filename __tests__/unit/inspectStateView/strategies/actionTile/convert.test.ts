import { convertActionTile } from "@/components/states/InspectStateView/strategies/actionTile/convert";

describe("convertActionTile strategy", () => {
  it("id is 'convert'", () => {
    expect(convertActionTile.id).toBe("convert");
  });

  it("applicableTo both video and audio", () => {
    expect(convertActionTile.applicableTo).toContain("video");
    expect(convertActionTile.applicableTo).toContain("audio");
  });

  it("getTile for video returns video-specific text", () => {
    const tile = convertActionTile.getTile("video");
    expect(tile.title).toBe("Convert container");
    expect(tile.sub).toBe("Re-mux without re-encoding");
  });

  it("getTile for audio returns audio-specific text", () => {
    const tile = convertActionTile.getTile("audio");
    expect(tile.title).toBe("Convert format");
    expect(tile.sub).toBe("Change to a different audio format");
  });

  it("getTile returns valid icon and color fields for both kinds", () => {
    for (const kind of ["video", "audio"] as const) {
      const tile = convertActionTile.getTile(kind);
      expect(tile.icon).toBeTruthy();
      expect(typeof tile.iconColor).toBe("string");
      expect(typeof tile.iconBg).toBe("string");
      expect(typeof tile.iconBorder).toBe("string");
    }
  });
});
