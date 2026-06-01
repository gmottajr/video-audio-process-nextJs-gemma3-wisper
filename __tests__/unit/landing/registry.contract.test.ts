import { landingSectionRegistry } from "@/app/_components/landing";
import type { LandingSectionStrategy } from "@/app/_components/landing";

describe("landingSectionRegistry contract", () => {
  it("contains exactly 6 sections", () => {
    expect(landingSectionRegistry).toHaveLength(6);
  });

  it("has unique ids", () => {
    const ids = landingSectionRegistry.map((s: LandingSectionStrategy) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique keys", () => {
    const keys = landingSectionRegistry.map((s: LandingSectionStrategy) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each strategy has a callable Component", () => {
    for (const strategy of landingSectionRegistry) {
      expect(typeof strategy.Component).toBe("function");
    }
  });

  it("section ids are in expected order", () => {
    const ids = landingSectionRegistry.map((s: LandingSectionStrategy) => s.id);
    expect(ids).toEqual(["hero", "forge", "stats", "proTip", "music", "footer"]);
  });

  it("no strategy has an empty id or key", () => {
    for (const strategy of landingSectionRegistry) {
      expect(strategy.id.length).toBeGreaterThan(0);
      expect(strategy.key.length).toBeGreaterThan(0);
    }
  });
});
