import type { ActionHandler, ActionHandlerContext } from "./types";

const extract: ActionHandler = {
  id: "extract",
  async handle({ file, formatId, options, processFile, completeProcessing }: ActionHandlerContext) {
    const result = await processFile(file, "extract", formatId, {
      normalizeAudio: options?.normalizeAudio ?? false,
      compressionType: options?.compressionType ?? "none",
    });
    completeProcessing(result);
  },
};

export default extract;
