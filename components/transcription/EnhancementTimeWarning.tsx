/**
 * EnhancementTimeWarning Component
 * 
 * Displays a warning about additional processing time when audio
 * compression and/or normalization features are enabled.
 */

import type { CompressionType } from "@/components/ActionSelector";

interface EnhancementTimeWarningProps {
  compressionType: CompressionType;
  normalizeAudio: boolean;
}

/**
 * Calculate the total time overhead percentage based on enabled features
 */
function calculateOverhead(compressionType: CompressionType, normalizeAudio: boolean): number {
  let multiplier = 1.0;
  
  if (compressionType === "speech") {
    multiplier *= 1.15;
  } else if (compressionType === "studio") {
    multiplier *= 1.12;
  } else if (compressionType === "both") {
    multiplier *= 1.25;
  }
  
  if (normalizeAudio) {
    multiplier *= 1.10;
  }
  
  return Math.round((multiplier - 1) * 100);
}

/**
 * Get human-readable list of enabled features
 */
function getEnabledFeatures(compressionType: CompressionType, normalizeAudio: boolean): string[] {
  const features: string[] = [];
  
  if (compressionType === "speech") {
    features.push("Speech compression");
  } else if (compressionType === "studio") {
    features.push("Studio compression");
  } else if (compressionType === "both") {
    features.push("Speech + Studio compression");
  }
  
  if (normalizeAudio) {
    features.push("Audio normalization");
  }
  
  return features;
}

export function EnhancementTimeWarning({
  compressionType,
  normalizeAudio,
}: EnhancementTimeWarningProps) {
  const hasEnhancements = compressionType !== "none" || normalizeAudio;
  
  if (!hasEnhancements) {
    return null;
  }
  
  const overhead = calculateOverhead(compressionType, normalizeAudio);
  const features = getEnabledFeatures(compressionType, normalizeAudio);
  
  return (
    <div className="mt-3 p-3 bg-amber-950/40 border border-amber-700/50 rounded-lg">
      <div className="flex items-start gap-2">
        <span className="text-amber-400 text-sm mt-0.5">⏱️</span>
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-200">
            Processing Time Increase: ~{overhead}%
          </p>
          <p className="text-xs text-amber-300/80 mt-1">
            {features.join(" + ")} will add a preprocessing step before transcription.
          </p>
        </div>
      </div>
    </div>
  );
}
