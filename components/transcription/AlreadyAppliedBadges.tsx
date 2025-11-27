/**
 * AlreadyAppliedBadges Component
 * 
 * Responsible for displaying badges showing which enhancements
 * have already been applied to the audio.
 */

import type { CompressionType } from "@/components/ActionSelector";

interface AlreadyAppliedBadgesProps {
  compressionType?: CompressionType;
  normalized?: boolean;
}

export function AlreadyAppliedBadges({
  compressionType,
  normalized,
}: AlreadyAppliedBadgesProps) {
  const wasCompressed = compressionType && compressionType !== "none";
  const wasNormalized = normalized;

  // Don't render if nothing was applied
  if (!wasCompressed && !wasNormalized) {
    return null;
  }

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-md p-3 mb-4">
      <p className="text-xs font-medium text-zinc-300 mb-1">Already Applied:</p>
      <div className="flex flex-wrap gap-2">
        {wasCompressed && (
          <span className="text-xs px-2 py-1 bg-green-950/50 border border-green-500/30 text-green-300 rounded-full">
            {compressionType === "speech"
              ? "🎙️ Speech Compressed"
              : compressionType === "studio"
              ? "🎚️ Studio Compressed"
              : "🎛️ Both Compressions"}
          </span>
        )}
        {wasNormalized && (
          <span className="text-xs px-2 py-1 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-full">
            🎵 Normalized
          </span>
        )}
      </div>
    </div>
  );
}

