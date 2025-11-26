/**
 * Compression Helper Utilities
 * 
 * Provides helper functions for working with audio compression types
 * throughout the application.
 */

import type { CompressionType } from "@/components/ActionSelector";

/**
 * Validate if a value is a valid CompressionType
 * 
 * @param value Value to validate
 * @returns True if value is a valid CompressionType
 * 
 * @example
 * isValidCompressionType("speech") // true
 * isValidCompressionType("invalid") // false
 * isValidCompressionType(undefined) // false
 */
export function isValidCompressionType(value: any): value is CompressionType {
  return ["none", "speech", "studio", "both"].includes(value);
}

/**
 * Get a safe CompressionType value with fallback to "none"
 * 
 * @param value Value to normalize
 * @param fallback Fallback value (default: "none")
 * @returns Valid CompressionType
 * 
 * @example
 * getSafeCompressionType("speech") // "speech"
 * getSafeCompressionType("invalid") // "none"
 * getSafeCompressionType(undefined) // "none"
 * getSafeCompressionType("invalid", "speech") // "speech"
 */
export function getSafeCompressionType(
  value: any,
  fallback: CompressionType = "none"
): CompressionType {
  if (isValidCompressionType(value)) {
    return value;
  }
  
  if (value !== undefined && value !== null) {
    console.warn(
      `[CompressionHelpers] Invalid compression type: ${value}, falling back to '${fallback}'`
    );
  }
  
  return fallback;
}

/**
 * Get a human-readable label for a compression type
 * 
 * @param type Compression type
 * @returns Human-readable label
 * 
 * @example
 * getCompressionLabel("speech") // "Speech Compression"
 * getCompressionLabel("studio") // "Studio Compression"
 * getCompressionLabel("both") // "Full Enhancement"
 * getCompressionLabel("none") // "No Compression"
 */
export function getCompressionLabel(type: CompressionType): string {
  switch (type) {
    case "speech":
      return "Speech Compression";
    case "studio":
      return "Studio Compression";
    case "both":
      return "Full Enhancement";
    case "none":
    default:
      return "No Compression";
  }
}

/**
 * Get an emoji icon for a compression type
 * 
 * @param type Compression type
 * @returns Emoji icon
 * 
 * @example
 * getCompressionIcon("speech") // "🎙️"
 * getCompressionIcon("studio") // "🎚️"
 * getCompressionIcon("both") // "✨"
 * getCompressionIcon("none") // "⭕"
 */
export function getCompressionIcon(type: CompressionType): string {
  switch (type) {
    case "speech":
      return "🎙️";
    case "studio":
      return "🎚️";
    case "both":
      return "✨";
    case "none":
    default:
      return "⭕";
  }
}

/**
 * Get the processing time overhead multiplier for a compression type
 * 
 * @param type Compression type
 * @returns Multiplier (1.0 = no overhead, 1.15 = 15% overhead)
 * 
 * @example
 * getCompressionOverhead("none") // 1.0
 * getCompressionOverhead("speech") // 1.15 (+15%)
 * getCompressionOverhead("studio") // 1.12 (+12%)
 * getCompressionOverhead("both") // 1.25 (+25%)
 */
export function getCompressionOverhead(type: CompressionType): number {
  switch (type) {
    case "speech":
      return 1.15; // +15%
    case "studio":
      return 1.12; // +12%
    case "both":
      return 1.25; // +25%
    case "none":
    default:
      return 1.0; // no overhead
  }
}

/**
 * Get a description of what a compression type does
 * 
 * @param type Compression type
 * @returns Description text
 * 
 * @example
 * getCompressionDescription("speech")
 * // "Dynamic audio normalization with frame-based analysis. Ideal for multi-speaker recordings."
 */
export function getCompressionDescription(type: CompressionType): string {
  switch (type) {
    case "speech":
      return "Dynamic audio normalization with frame-based analysis. Ideal for multi-speaker recordings with varying distances from microphone.";
    case "studio":
      return "Professional studio compression with 4:1 ratio and -20dB threshold. Provides consistent, broadcast-quality audio.";
    case "both":
      return "Applies speech compression first, then studio compression. Maximum processing for difficult audio, may be overkill for most use cases.";
    case "none":
    default:
      return "No compression applied. Preserves the natural dynamic range of the audio.";
  }
}

/**
 * Get the best use cases for a compression type
 * 
 * @param type Compression type
 * @returns Array of use case strings
 * 
 * @example
 * getCompressionUseCases("speech")
 * // ["Meetings", "Interviews", "Conversations", "Multi-speaker recordings"]
 */
export function getCompressionUseCases(type: CompressionType): string[] {
  switch (type) {
    case "speech":
      return ["Meetings", "Interviews", "Conversations", "Multi-speaker recordings"];
    case "studio":
      return ["Podcasts", "Broadcasts", "Professional audio", "Audiobooks"];
    case "both":
      return ["Very quiet recordings", "Highly dynamic audio", "Low-quality sources"];
    case "none":
    default:
      return ["High-quality studio recordings", "Already processed audio", "Music"];
  }
}

/**
 * Check if a compression type requires warning
 * 
 * @param type Compression type
 * @returns True if warning should be displayed
 * 
 * @example
 * shouldWarnAboutCompression("both") // true
 * shouldWarnAboutCompression("speech") // false
 */
export function shouldWarnAboutCompression(type: CompressionType): boolean {
  return type === "both";
}

/**
 * Get warning message for a compression type
 * 
 * @param type Compression type
 * @returns Warning message or null
 * 
 * @example
 * getCompressionWarning("both")
 * // "⚠️ May over-compress, test with your content"
 */
export function getCompressionWarning(type: CompressionType): string | null {
  switch (type) {
    case "both":
      return "⚠️ May over-compress, test with your content";
    default:
      return null;
  }
}

/**
 * Get color class for a compression type (for Tailwind CSS)
 * 
 * @param type Compression type
 * @returns Color identifier
 * 
 * @example
 * getCompressionColor("speech") // "green"
 * getCompressionColor("studio") // "blue"
 */
export function getCompressionColor(type: CompressionType): string {
  switch (type) {
    case "speech":
      return "green";
    case "studio":
      return "blue";
    case "both":
      return "orange";
    case "none":
    default:
      return "zinc";
  }
}

/**
 * Build a combined label for compression and normalization
 * 
 * @param compressionType Compression type
 * @param normalized Whether normalization is enabled
 * @returns Combined label
 * 
 * @example
 * getCombinedEnhancementLabel("speech", true)
 * // "Speech Compression + Normalization"
 * 
 * getCombinedEnhancementLabel("none", true)
 * // "Normalization"
 * 
 * getCombinedEnhancementLabel("studio", false)
 * // "Studio Compression"
 */
export function getCombinedEnhancementLabel(
  compressionType: CompressionType,
  normalized: boolean
): string {
  const labels: string[] = [];
  
  if (compressionType !== "none") {
    labels.push(getCompressionLabel(compressionType));
  }
  
  if (normalized) {
    labels.push("Normalization");
  }
  
  if (labels.length === 0) {
    return "No Enhancement";
  }
  
  return labels.join(" + ");
}

/**
 * Calculate combined processing overhead
 * 
 * @param compressionType Compression type
 * @param normalized Whether normalization is enabled
 * @returns Total multiplier
 * 
 * @example
 * getCombinedOverhead("speech", true) // 1.265 (15% compression + 10% normalization)
 * getCombinedOverhead("none", false) // 1.0
 */
export function getCombinedOverhead(
  compressionType: CompressionType,
  normalized: boolean
): number {
  let overhead = getCompressionOverhead(compressionType);
  
  if (normalized) {
    overhead *= 1.1; // +10% for normalization
  }
  
  return overhead;
}

/**
 * Format overhead as percentage string
 * 
 * @param overhead Multiplier (e.g., 1.15)
 * @returns Formatted string (e.g., "+15%")
 * 
 * @example
 * formatOverhead(1.15) // "+15%"
 * formatOverhead(1.0) // "0%"
 */
export function formatOverhead(overhead: number): string {
  const percentage = Math.round((overhead - 1.0) * 100);
  return percentage > 0 ? `+${percentage}%` : "0%";
}

/**
 * Check if any audio enhancement is active
 * 
 * @param compressionType Compression type
 * @param normalized Whether normalization is enabled
 * @returns True if any enhancement is active
 * 
 * @example
 * hasAnyEnhancement("speech", false) // true
 * hasAnyEnhancement("none", true) // true
 * hasAnyEnhancement("none", false) // false
 */
export function hasAnyEnhancement(
  compressionType: CompressionType,
  normalized: boolean
): boolean {
  return compressionType !== "none" || normalized;
}

