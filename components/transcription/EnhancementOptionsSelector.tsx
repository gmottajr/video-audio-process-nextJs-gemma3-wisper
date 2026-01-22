/**
 * EnhancementOptionsSelector Component
 * 
 * Responsible for rendering compression and normalization options.
 */

import type { CompressionType } from "@/components/ActionSelector";
import { EnhancementTimeWarning } from "./EnhancementTimeWarning";

interface EnhancementOptionsSelectorProps {
  compressionType: CompressionType;
  normalizeAudio: boolean;
  wasCompressed: boolean;
  wasNormalized: boolean;
  onCompressionChange: (type: CompressionType) => void;
  onNormalizeChange: (normalize: boolean) => void;
}

export function EnhancementOptionsSelector({
  compressionType,
  normalizeAudio,
  wasCompressed,
  wasNormalized,
  onCompressionChange,
  onNormalizeChange,
}: EnhancementOptionsSelectorProps) {
  return (
    <div className="space-y-3 mb-4">
      {/* Compression Selector (only if not already compressed) */}
      {!wasCompressed && (
        <div>
          <label
            htmlFor="compression-type"
            className="text-xs font-medium text-zinc-300 mb-1.5 block"
          >
            Add Compression (Optional):
          </label>
          <select
            id="compression-type"
            value={compressionType}
            onChange={(e) => onCompressionChange(e.target.value as CompressionType)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="none">⭕ No Compression (use as-is)</option>
            <option value="speech">🎙️ Speech - Meetings, Interviews (+15%)</option>
            <option value="studio">🎚️ Studio - Podcasts, Broadcasts (+12%)</option>
            <option value="both">🎛️ Both - Maximum Enhancement (+25%)</option>
          </select>
        </div>
      )}

      {/* Normalization Checkbox (only if not already normalized) */}
      {!wasNormalized && (
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={normalizeAudio}
            onChange={(e) => onNormalizeChange(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
          />
          <span className="ml-2 text-sm text-zinc-100 group-hover:text-purple-300 transition-colors">
            🎵 Normalize Audio (EBU R128) - Improves transcription
          </span>
        </label>
      )}
      
      {/* Time Warning - shows when any enhancement is enabled */}
      <EnhancementTimeWarning 
        compressionType={compressionType} 
        normalizeAudio={normalizeAudio} 
      />
    </div>
  );
}

