/**
 * SmartRecommendations Component
 * 
 * Responsible for displaying smart recommendations based on
 * audio content type and selected options.
 */

import type { CompressionType } from "@/components/ActionSelector";
import { getSmartRecommendation } from "@/utils/audioContentDetector";

interface SmartRecommendationsProps {
  filename: string;
  compressionType: CompressionType;
  wasCompressed: boolean;
  hasNewEnhancements: boolean;
}

export function SmartRecommendations({
  filename,
  compressionType,
  wasCompressed,
  hasNewEnhancements,
}: SmartRecommendationsProps) {
  const recommendation = getSmartRecommendation(
    filename,
    compressionType,
    wasCompressed,
    hasNewEnhancements
  );

  if (!recommendation) {
    return null;
  }

  return (
    <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
      <p className="text-xs text-blue-300 leading-relaxed">{recommendation}</p>
    </div>
  );
}

