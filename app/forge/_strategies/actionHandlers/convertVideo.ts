import type { ActionHandler, ActionHandlerContext } from "./types";

const convertVideo: ActionHandler = {
  id: "convert_video",
  async handle({ file, formatId, options, processFile, completeProcessing }: ActionHandlerContext) {
    const result = await processFile(file, "convert_video", formatId, {
      resolutionId: options?.resolutionId,
    });
    completeProcessing(result);
  },
};

export default convertVideo;
