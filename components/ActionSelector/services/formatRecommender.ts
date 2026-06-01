import type { CompressionType } from "../types";

export function getSmartRecommendation(
  filename: string,
  normalizeAudio: boolean,
  compressionType: CompressionType,
): string | null {
  const lower = filename.toLowerCase();
  const isMeetingContent = /meeting|interview|call|conversation|conference/i.test(lower);
  const isPodcastContent = /podcast|broadcast|episode|show/i.test(lower);

  if (isMeetingContent && compressionType !== "speech") {
    return "Speech compression recommended for multi-speaker content";
  }
  if (isPodcastContent && compressionType !== "studio") {
    return "Studio compression recommended for professional broadcasting";
  }
  if (normalizeAudio && compressionType !== "none") {
    return "Full audio enhancement active — optimal for transcription";
  }
  return null;
}
