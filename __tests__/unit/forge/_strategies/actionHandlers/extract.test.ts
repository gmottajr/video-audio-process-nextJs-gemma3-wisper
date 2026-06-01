import extract from "@/app/forge/_strategies/actionHandlers/extract";
import type { ActionHandlerContext } from "@/app/forge/_strategies/actionHandlers/types";

function makeCtx(overrides: Partial<ActionHandlerContext> = {}): ActionHandlerContext {
  return {
    file: new File(["audio"], "test.mp3", { type: "audio/mp3" }),
    formatId: "wav",
    options: undefined,
    transcriptionMode: "standard",
    selectedModelKey: "base",
    fastModeEnabled: false,
    processFile: jest.fn().mockResolvedValue({ type: "audio", blobUrl: "blob:1" }),
    completeProcessing: jest.fn(),
    fastTranscriber: {} as never,
    ffmpeg: {} as never,
    ...overrides,
  };
}

describe("extract action handler", () => {
  test("calls processFile with action=extract and correct formatId", async () => {
    const ctx = makeCtx();
    await extract.handle(ctx);
    expect(ctx.processFile).toHaveBeenCalledWith(ctx.file, "extract", "wav", expect.any(Object));
  });

  test("calls completeProcessing with the processFile result", async () => {
    const result = { type: "audio" as const, blobUrl: "blob:x" };
    const ctx = makeCtx({ processFile: jest.fn().mockResolvedValue(result) });
    await extract.handle(ctx);
    expect(ctx.completeProcessing).toHaveBeenCalledWith(result);
  });

  test("passes normalizeAudio and compressionType from options", async () => {
    const ctx = makeCtx({
      options: { normalizeAudio: true, compressionType: "speech" },
    });
    await extract.handle(ctx);
    expect(ctx.processFile).toHaveBeenCalledWith(
      ctx.file, "extract", "wav",
      expect.objectContaining({ normalizeAudio: true, compressionType: "speech" })
    );
  });
});
