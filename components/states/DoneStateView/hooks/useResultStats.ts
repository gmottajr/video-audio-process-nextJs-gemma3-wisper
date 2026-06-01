import type { ProcessingResult } from "@/hooks/useMediaProcessor";

interface UseResultStatsProps {
  result: ProcessingResult;
  processingStartTime?: number | null;
  processingEndTime?: number | null;
}

export function useResultStats({
  result,
  processingStartTime,
  processingEndTime,
}: UseResultStatsProps) {
  const elapsed =
    processingStartTime && processingEndTime
      ? Math.max(1, Math.round((processingEndTime - processingStartTime) / 1000))
      : null;

  const elapsedStr =
    elapsed != null
      ? elapsed > 60
        ? `${Math.floor(elapsed / 60)}m ${(elapsed % 60).toString().padStart(2, "0")}s`
        : `${elapsed}s`
      : null;

  const charCount =
    result.type === "transcription" ? (result.transcription?.text?.length ?? 0) : null;

  return { elapsedStr, charCount };
}
