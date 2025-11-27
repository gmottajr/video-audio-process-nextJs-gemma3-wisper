/**
 * Audio Content Detector Utility
 * 
 * Responsible for detecting content types from filenames and generating
 * smart recommendations for audio enhancement options.
 */

export type ContentType = "meeting" | "podcast" | "music" | "general";

export interface ContentDetectionResult {
  type: ContentType;
  confidence: number;
  suggestedCompression?: "speech" | "studio" | "both" | "none";
}

/**
 * Detect content type from filename
 */
export function detectContentType(filename: string): ContentDetectionResult {
  const lower = filename.toLowerCase();

  // Meeting/Interview content detection
  if (/meeting|interview|call|conversation|conference|discussion/i.test(lower)) {
    return {
      type: "meeting",
      confidence: 0.9,
      suggestedCompression: "speech",
    };
  }

  // Podcast/Broadcast content detection
  if (/podcast|broadcast|episode|show|radio/i.test(lower)) {
    return {
      type: "podcast",
      confidence: 0.85,
      suggestedCompression: "studio",
    };
  }

  // Music content detection
  if (/music|song|album|track/i.test(lower)) {
    return {
      type: "music",
      confidence: 0.8,
      suggestedCompression: "studio",
    };
  }

  // Default: general content
  return {
    type: "general",
    confidence: 0.5,
    suggestedCompression: "none",
  };
}

/**
 * Generate smart recommendation message based on content type and current settings
 */
export function getSmartRecommendation(
  filename: string,
  currentCompression: string,
  wasCompressed: boolean,
  hasNewEnhancements: boolean
): string | null {
  const detection = detectContentType(filename);

  // If new enhancements are selected, show confirmation
  if (hasNewEnhancements) {
    return "✨ Audio will be enhanced before transcription for better accuracy";
  }

  // If already compressed, don't suggest more compression
  if (wasCompressed) {
    return null;
  }

  // Suggest compression based on content type
  switch (detection.type) {
    case "meeting":
      if (currentCompression !== "speech") {
        return "💡 Tip: Speech compression recommended for multi-speaker content";
      }
      break;

    case "podcast":
      if (currentCompression !== "studio") {
        return "💡 Tip: Studio compression recommended for professional broadcasting";
      }
      break;

    case "music":
      if (currentCompression !== "studio") {
        return "💡 Tip: Studio compression recommended for music content";
      }
      break;

    default:
      return null;
  }

  return null;
}

