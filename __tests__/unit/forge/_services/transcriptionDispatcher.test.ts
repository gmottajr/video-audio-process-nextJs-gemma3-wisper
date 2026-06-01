import {
  shouldUseFastMode,
  dispatchStandardProcessing,
} from "@/app/forge/_services/transcriptionDispatcher";
import type { DispatchStandardInput } from "@/app/forge/_services/transcriptionDispatcher";

jest.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: (flag: string) => flag === "ENABLE_PARALLEL_WORKERS",
}));

const mockProcessFile = jest.fn().mockResolvedValue({ type: "audio", blobUrl: "blob:1" });

function makeStandardInput(overrides: Partial<DispatchStandardInput> = {}): DispatchStandardInput {
  return {
    file: new File(["audio"], "test.mp3"),
    action: "transcribe",
    formatId: "",
    options: undefined,
    transcriptionMode: "standard",
    selectedModelKey: "base",
    processFile: mockProcessFile,
    ...overrides,
  };
}

describe("shouldUseFastMode", () => {
  test("returns true when all conditions met", () => {
    expect(shouldUseFastMode("transcribe", "fast", true)).toBe(true);
  });

  test("returns false when action is not transcribe", () => {
    expect(shouldUseFastMode("extract", "fast", true)).toBe(false);
  });

  test("returns false when transcriptionMode is not fast", () => {
    expect(shouldUseFastMode("transcribe", "standard", true)).toBe(false);
  });

  test("returns false when fastModeEnabled is false", () => {
    expect(shouldUseFastMode("transcribe", "fast", false)).toBe(false);
  });
});

describe("dispatchStandardProcessing", () => {
  beforeEach(() => mockProcessFile.mockClear());

  test("passes modelKey through in standard mode", async () => {
    await dispatchStandardProcessing(makeStandardInput({ selectedModelKey: "small" }));
    expect(mockProcessFile).toHaveBeenCalledWith(
      expect.any(File), "transcribe", "",
      expect.objectContaining({ modelKey: "small" })
    );
  });

  test("overrides modelKey to distil-small in fast mode", async () => {
    await dispatchStandardProcessing(makeStandardInput({ transcriptionMode: "fast" }));
    expect(mockProcessFile).toHaveBeenCalledWith(
      expect.any(File), "transcribe", "",
      expect.objectContaining({ modelKey: "distil-small" })
    );
  });

  test("disables normalizeAudio in fast mode", async () => {
    await dispatchStandardProcessing(
      makeStandardInput({ transcriptionMode: "fast", options: { normalizeAudio: true } })
    );
    expect(mockProcessFile).toHaveBeenCalledWith(
      expect.any(File), "transcribe", "",
      expect.objectContaining({ normalizeAudio: false })
    );
  });

  test("forces compressionType to none in fast mode", async () => {
    await dispatchStandardProcessing(
      makeStandardInput({ transcriptionMode: "fast", options: { compressionType: "speech" } })
    );
    expect(mockProcessFile).toHaveBeenCalledWith(
      expect.any(File), "transcribe", "",
      expect.objectContaining({ compressionType: "none" })
    );
  });

  test("preserves normalizeAudio in standard mode", async () => {
    await dispatchStandardProcessing(
      makeStandardInput({ options: { normalizeAudio: true } })
    );
    expect(mockProcessFile).toHaveBeenCalledWith(
      expect.any(File), "transcribe", "",
      expect.objectContaining({ normalizeAudio: true })
    );
  });
});
