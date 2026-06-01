import type { ActionHandler, ActionHandlerContext } from "./types";

const convertAudio: ActionHandler = {
  id: "convert_audio",
  async handle({ file, formatId, options, processFile, completeProcessing }: ActionHandlerContext) {
    const result = await processFile(file, "convert_audio", formatId, {
      normalizeAudio: options?.normalizeAudio ?? false,
      compressionType: options?.compressionType ?? "none",
    });
    completeProcessing(result);
  },
};

export default convertAudio;
