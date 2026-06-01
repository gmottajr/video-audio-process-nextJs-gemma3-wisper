import { unknownFileKind } from "@/components/states/InspectStateView/strategies/fileKind/unknown";

describe("unknownFileKind strategy", () => {
  it("kind is 'unknown'", () => {
    expect(unknownFileKind.kind).toBe("unknown");
  });

  it("detect always returns true (fallback)", () => {
    expect(unknownFileKind.detect(new File([""], "f.pdf", { type: "application/pdf" }))).toBe(true);
    expect(unknownFileKind.detect(new File([""], "f.txt", { type: "text/plain" }))).toBe(true);
  });

  it("availableActions is empty", () => {
    expect(unknownFileKind.availableActions).toHaveLength(0);
  });

  it("icon is a valid React component", () => {
    expect(unknownFileKind.icon).toBeTruthy();
  });
});
