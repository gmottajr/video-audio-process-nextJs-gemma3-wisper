import {
  actionTileStrategies,
  getActionTilesForKind,
  getActionTileStrategy,
} from "@/components/states/InspectStateView/strategies/actionTile/registry";

describe("actionTile registry contract", () => {
  it("has exactly 3 strategies registered", () => {
    expect(actionTileStrategies).toHaveLength(3);
  });

  it("has no duplicate ids", () => {
    const ids = actionTileStrategies.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each strategy satisfies the interface", () => {
    for (const s of actionTileStrategies) {
      expect(["extract", "convert", "transcribe"]).toContain(s.id);
      expect(Array.isArray(s.applicableTo)).toBe(true);
      expect(typeof s.getTile).toBe("function");
    }
  });

  it("getActionTilesForKind returns 3 strategies for video", () => {
    expect(getActionTilesForKind("video")).toHaveLength(3);
  });

  it("getActionTilesForKind returns 2 strategies for audio", () => {
    const tiles = getActionTilesForKind("audio");
    expect(tiles).toHaveLength(2);
    const ids = tiles.map((t) => t.id);
    expect(ids).toContain("convert");
    expect(ids).toContain("transcribe");
    expect(ids).not.toContain("extract");
  });

  it("getActionTileStrategy finds by id", () => {
    expect(getActionTileStrategy("extract")?.id).toBe("extract");
    expect(getActionTileStrategy("convert")?.id).toBe("convert");
    expect(getActionTileStrategy("transcribe")?.id).toBe("transcribe");
    expect(getActionTileStrategy("nonexistent")).toBeUndefined();
  });
});
