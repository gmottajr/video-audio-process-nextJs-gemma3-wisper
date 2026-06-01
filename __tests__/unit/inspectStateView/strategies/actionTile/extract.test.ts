import { extractActionTile } from "@/components/states/InspectStateView/strategies/actionTile/extract";

describe("extractActionTile strategy", () => {
  it("id is 'extract'", () => {
    expect(extractActionTile.id).toBe("extract");
  });

  it("applicableTo video only", () => {
    expect(extractActionTile.applicableTo).toContain("video");
    expect(extractActionTile.applicableTo).not.toContain("audio");
  });

  it("getTile returns expected config for video", () => {
    const tile = extractActionTile.getTile("video");
    expect(tile.title).toBe("Extract audio");
    expect(tile.sub).toBe("Pull audio track from video");
    expect(tile.icon).toBeTruthy();
    expect(typeof tile.iconColor).toBe("string");
    expect(typeof tile.iconBg).toBe("string");
    expect(typeof tile.iconBorder).toBe("string");
  });
});
