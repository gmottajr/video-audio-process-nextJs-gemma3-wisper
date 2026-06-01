import { useState } from "react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

export function useDownloadAction({
  result,
  formatId,
}: {
  result: ProcessingResult;
  formatId: string | null;
}) {
  const [showStats, setShowStats] = useState(false);

  const format =
    result.type === "audio"
      ? getFormatById(formatId || "")
      : result.type === "video"
      ? getVideoFormatById(formatId || "")
      : null;

  return { showStats, setShowStats, format: format ?? null };
}
