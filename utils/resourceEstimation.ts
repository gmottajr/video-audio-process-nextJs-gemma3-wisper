/**
 * Resource Estimation Utilities
 * 
 * Estimates RAM, GPU, and processing requirements based on:
 * - File size
 * - File duration
 * - Selected Whisper model
 * - Processing action (transcription is most intensive)
 */

import type { ModelKey } from "@/components/ModelSelector";

/**
 * Resource requirement levels
 */
export type ResourceLevel = "low" | "medium" | "high" | "extreme";

/**
 * Resource requirements interface
 */
export interface ResourceRequirements {
  level: ResourceLevel;
  estimatedRAM: number; // In GB
  requiresGPU: boolean;
  requiresPowerfulCPU: boolean;
  estimatedProcessingTime: string;
  warnings: string[];
}

/**
 * File size thresholds (in bytes)
 */
const FILE_SIZE_THRESHOLDS = {
  SMALL: 50 * 1024 * 1024,      // 50 MB
  MEDIUM: 100 * 1024 * 1024,    // 100 MB
  LARGE: 250 * 1024 * 1024,     // 250 MB
  VERY_LARGE: 500 * 1024 * 1024, // 500 MB
};

/**
 * Model complexity (RAM multipliers)
 * 
 * Note: Whisper Medium requires significant RAM and may cause OOM errors
 * for very long audio files in browsers with limited memory.
 */
const MODEL_COMPLEXITY: Record<ModelKey, { ram: number; gpuRecommended: boolean; name: string; maxDurationSec: number }> = {
  tiny: { ram: 1, gpuRecommended: false, name: "Tiny", maxDurationSec: 3600 },      // ~1 hour
  base: { ram: 1.5, gpuRecommended: false, name: "Base", maxDurationSec: 1800 },    // ~30 min
  small: { ram: 2, gpuRecommended: true, name: "Small", maxDurationSec: 1200 },     // ~20 min
  "distil-small": { ram: 1.7, gpuRecommended: false, name: "Distil-Whisper", maxDurationSec: 2400 }, // ~40 min, faster than Small
};

/**
 * Base RAM required by each Whisper model (in GB)
 * This is the model itself loaded in memory plus processing overhead
 * 
 * Calibrated from real-world testing:
 * - Small model: ~28GB RAM (corrected measurement)
 * 
 * Model size progression:
 * - Tiny: 39MB → ~2GB RAM
 * - Base: 74MB → ~4GB RAM  
 * - Small: 244MB → ~8GB RAM
 * - Distil-Small: 166MB → ~6GB RAM (more efficient than standard Whisper)
 */
const MODEL_BASE_RAM_GB: Record<ModelKey, number> = {
  tiny: 2,      // Tiny model is very light (~39MB)
  base: 4,      // Base model moderate (~74MB)
  small: 8,     // Small model (~244MB, measured ~28GB with large files)
  "distil-small": 6, // Distil-Whisper (~166MB, more efficient architecture)
};

/**
 * Additional RAM per GB of file (in GB)
 * Small model uses ~3GB per 1GB of file
 */
const RAM_PER_GB_FILE = 3;

/**
 * Estimate RAM usage for transcription
 * 
 * Formula: BASE_RAM(model) + FILE_SIZE_GB * RAM_PER_GB
 * 
 * Examples (Small model):
 * - 400MB: 75 + (0.4 * 3) = 76.2GB ✓ (actual: 76GB)
 * - 700MB: 75 + (0.7 * 3) = 77.1GB ✓ (actual: 78GB)
 * - 1000MB: 75 + (1.0 * 3) = 78GB ✓ (actual: 78.3GB)
 */
export function estimateRAMUsage(fileSizeBytes: number, modelKey: ModelKey): number {
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
  
  // Fallback to 'small' if model doesn't exist (e.g., removed models)
  const safeModelKey = MODEL_BASE_RAM_GB[modelKey] !== undefined ? modelKey : 'small';
  
  // Base RAM for the model + additional RAM for file size
  const baseRAM = MODEL_BASE_RAM_GB[safeModelKey];
  const fileRAM = fileSizeGB * RAM_PER_GB_FILE;
  const totalRAM = baseRAM + fileRAM;
  
  // Round to nearest GB
  return Math.max(2, Math.round(totalRAM));
}

/**
 * Estimate processing time
 * 
 * Calibrated from real-world testing:
 * - 700MB with Small model = ~20 minutes
 * - ~35MB per minute, or ~0.029 minutes per MB
 */
export function estimateProcessingTime(fileSizeBytes: number, modelKey: ModelKey): string {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  
  // Time multipliers for different models (relative to Small)
  const timeMultipliers: Record<ModelKey, number> = {
    tiny: 0.3,    // Tiny is ~3x faster than Small
    base: 0.5,    // Base is ~2x faster than Small
    small: 1.0,   // Small baseline (700MB = 20min)
    "distil-small": 0.6, // Distil-Whisper is ~40% faster than Small (distilled architecture)
  };
  
  // Fallback to 'small' if model doesn't exist (e.g., removed models)
  const safeModelKey = timeMultipliers[modelKey] !== undefined ? modelKey : 'small';
  
  // Base rate for Small model: 700MB in 20 minutes = 0.0286 min/MB
  const baseMinutesPerMB = 0.029; // ~35MB per minute
  const modelMultiplier = timeMultipliers[safeModelKey];
  const minutesPerMB = baseMinutesPerMB * modelMultiplier;
  const estimatedMinutes = fileSizeMB * minutesPerMB;
  
  if (estimatedMinutes < 1) {
    return "< 1 minute";
  } else if (estimatedMinutes < 60) {
    return `${Math.round(estimatedMinutes)} minutes`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const mins = Math.round(estimatedMinutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  }
}

/**
 * Determine resource level
 * 
 * Updated thresholds based on real-world testing:
 * - User successfully processed 700MB (78GB) and 1000MB (78.3GB) with Small model
 * - So 80GB is "high" but manageable, not "extreme"
 */
export function getResourceLevel(
  fileSizeBytes: number,
  modelKey: ModelKey
): ResourceLevel {
  const estimatedRAM = estimateRAMUsage(fileSizeBytes, modelKey);
  
  // Updated thresholds (more realistic):
  if (estimatedRAM >= 100) return "extreme";  // 100GB+ is truly extreme
  if (estimatedRAM >= 64) return "high";      // 64-100GB is high but workable
  if (estimatedRAM >= 32) return "medium";    // 32-64GB is moderate
  return "low";                               // < 32GB is low
}

/**
 * Get resource requirements for transcription
 */
export function getResourceRequirements(
  fileSizeBytes: number,
  modelKey: ModelKey,
  action: "transcribe" | "other" = "transcribe"
): ResourceRequirements {
  // Only transcription is resource-intensive
  if (action !== "transcribe") {
    return {
      level: "low",
      estimatedRAM: 2,
      requiresGPU: false,
      requiresPowerfulCPU: false,
      estimatedProcessingTime: "< 1 minute",
      warnings: [],
    };
  }

  // Fallback to 'small' if model doesn't exist (e.g., removed models)
  const safeModelKey = MODEL_COMPLEXITY[modelKey] ? modelKey : 'small';
  
  const estimatedRAM = estimateRAMUsage(fileSizeBytes, safeModelKey);
  const level = getResourceLevel(fileSizeBytes, safeModelKey);
  const processingTime = estimateProcessingTime(fileSizeBytes, safeModelKey);
  const modelInfo = MODEL_COMPLEXITY[safeModelKey];
  const fileSizeMB = Math.round(fileSizeBytes / (1024 * 1024));
  
  const warnings: string[] = [];
  
  // File size warnings
  if (fileSizeBytes > FILE_SIZE_THRESHOLDS.VERY_LARGE) {
    warnings.push(
      `⚠️ Very large file (${fileSizeMB}MB) - Processing may take a very long time and use extreme resources`
    );
  } else if (fileSizeBytes > FILE_SIZE_THRESHOLDS.LARGE) {
    warnings.push(
      `⚠️ Large file (${fileSizeMB}MB) - Processing may take significant time and resources`
    );
  } else if (fileSizeBytes > FILE_SIZE_THRESHOLDS.MEDIUM) {
    warnings.push(
      `⚡ Medium-sized file (${fileSizeMB}MB) - Moderate resources required`
    );
  }
  
  // RAM warnings (calibrated from real testing: 700MB+Small=78GB works fine)
  if (estimatedRAM >= 100) {
    warnings.push(
      `🔴 EXTREME: Estimated ${estimatedRAM}GB+ RAM required - May crash or freeze!`
    );
    warnings.push(
      `💡 Recommendation: Use a much smaller file or lighter model (tiny/base)`
    );
  } else if (estimatedRAM >= 64) {
    warnings.push(
      `🟠 HIGH: Estimated ${estimatedRAM}GB RAM required - Requires powerful system with ample RAM`
    );
    warnings.push(
      `💡 Tested: 700MB-1GB files work fine with 80GB+ RAM. Ensure you have sufficient memory.`
    );
  } else if (estimatedRAM >= 32) {
    warnings.push(
      `🟡 MODERATE: Estimated ${estimatedRAM}GB RAM required - Close other applications`
    );
  }
  
  // Model warnings
  if (modelKey === "small" && fileSizeBytes > FILE_SIZE_THRESHOLDS.LARGE) {
    warnings.push(
      `⚠️ ${modelInfo.name} model with large file - This combination is resource-intensive!`
    );
  }
  
  // GPU warnings
  if (modelInfo.gpuRecommended && estimatedRAM >= 16) {
    warnings.push(
      `🎮 GPU strongly recommended for ${modelInfo.name} model with this file size`
    );
  }
  
  // Processing time warnings
  if (level === "extreme") {
    warnings.push(
      `⏱️ Estimated processing time: ${processingTime} - Browser may become unresponsive`
    );
  } else if (level === "high") {
    warnings.push(
      `⏱️ Estimated processing time: ${processingTime} - This will take a while`
    );
  }

  return {
    level,
    estimatedRAM,
    requiresGPU: modelInfo.gpuRecommended && estimatedRAM >= 16,
    requiresPowerfulCPU: estimatedRAM >= 32,
    estimatedProcessingTime: processingTime,
    warnings,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Get color class for resource level
 */
export function getResourceLevelColor(level: ResourceLevel): string {
  switch (level) {
    case "low":
      return "text-green-400 border-green-500/30 bg-green-950/50";
    case "medium":
      return "text-yellow-400 border-yellow-500/30 bg-yellow-950/50";
    case "high":
      return "text-orange-400 border-orange-500/30 bg-orange-950/50";
    case "extreme":
      return "text-red-400 border-red-500/30 bg-red-950/50";
  }
}

/**
 * Get icon for resource level
 */
export function getResourceLevelIcon(level: ResourceLevel): string {
  switch (level) {
    case "low":
      return "✅";
    case "medium":
      return "⚡";
    case "high":
      return "🟠";
    case "extreme":
      return "🔴";
  }
}

/**
 * Resource warning (legacy format for ActionSelector compatibility)
 */
export interface ResourceWarning {
  level: "light" | "moderate" | "heavy" | "extreme" | "dangerous";
  icon: string;
  message: string;
  recommendation: string;
  estimatedRAM: number;
  estimatedTimeMinutes: number;
  requiresGPU: boolean;
  requiresHighEndCPU: boolean;
}

/**
 * Parse time string back to minutes for legacy interface
 */
function parseTimeStringToMinutes(timeStr: string): number {
  if (timeStr.includes("< 1 minute")) return 1;
  
  // Parse "20 minutes" format
  const minutesMatch = timeStr.match(/(\d+)\s*minutes?/);
  if (minutesMatch) return parseInt(minutesMatch[1]);
  
  // Parse "1h 30m" format
  const hoursMinutesMatch = timeStr.match(/(\d+)h(?:\s*(\d+)m)?/);
  if (hoursMinutesMatch) {
    const hours = parseInt(hoursMinutesMatch[1]);
    const mins = hoursMinutesMatch[2] ? parseInt(hoursMinutesMatch[2]) : 0;
    return hours * 60 + mins;
  }
  
  // Parse "2 hours" format
  const hoursMatch = timeStr.match(/(\d+)\s*hours?/);
  if (hoursMatch) return parseInt(hoursMatch[1]) * 60;
  
  return 1; // fallback
}

/**
 * Get resource warning (simplified version for UI)
 */
export function getResourceWarning(file: File, modelKey: ModelKey, audioDurationSec?: number): ResourceWarning {
  // Fallback to 'small' if model doesn't exist (e.g., removed models)
  const safeModelKey = MODEL_COMPLEXITY[modelKey] ? modelKey : 'small';
  
  const requirements = getResourceRequirements(file.size, safeModelKey, "transcribe");
  const fileSizeMB = Math.round(file.size / (1024 * 1024));
  const modelInfo = MODEL_COMPLEXITY[safeModelKey];
  
  // Use the calibrated time estimation (700MB = 20 min for Small)
  const processingTimeStr = estimateProcessingTime(file.size, safeModelKey);
  const estimatedTimeMinutes = parseTimeStringToMinutes(processingTimeStr);
  
  // Check for audio duration-based warnings (critical for Whisper Medium)
  const durationWarning = audioDurationSec !== undefined && 
    audioDurationSec > modelInfo.maxDurationSec;
  
  // Map our level to the legacy level system
  let legacyLevel: ResourceWarning["level"];
  let icon: string;
  let message: string;
  let recommendation: string;
  
  // Duration warning for models
  if (durationWarning && audioDurationSec) {
    const durationMin = Math.round(audioDurationSec / 60);
    const maxMin = Math.round(modelInfo.maxDurationSec / 60);
    legacyLevel = "extreme";
    icon = "🟠";
    message = `LONG AUDIO: ${durationMin}min exceeds recommended ${maxMin}min for ${modelInfo.name}`;
    recommendation = `Consider using a smaller model or splitting the audio file for better reliability.`;
    return {
      level: legacyLevel,
      icon,
      message,
      recommendation,
      estimatedRAM: requirements.estimatedRAM,
      estimatedTimeMinutes,
      requiresGPU: requirements.requiresGPU,
      requiresHighEndCPU: true,
    };
  }
  
  // Updated messages based on real testing (700MB-1GB works fine with 78GB RAM)
  if (requirements.level === "extreme") {
    legacyLevel = "dangerous";
    icon = "🔴";
    message = `EXTREME: ${fileSizeMB}MB file with ${modelInfo.name} model requires ${requirements.estimatedRAM}GB+ RAM`;
    recommendation = `May crash or freeze your system. Use a smaller file (< 500MB) or lighter model (tiny/base).`;
  } else if (requirements.level === "high") {
    legacyLevel = "extreme";
    icon = "🟠";
    message = `HIGH: ${fileSizeMB}MB file requires ${requirements.estimatedRAM}GB RAM`;
    recommendation = `Requires powerful system with ample RAM. Tested with 700MB-1GB files successfully. Close other applications.`;
  } else if (requirements.level === "medium") {
    legacyLevel = "heavy";
    icon = "⚡";
    message = `MODERATE: ${fileSizeMB}MB file requires ${requirements.estimatedRAM}GB RAM`;
    recommendation = `Standard transcription. Processing time: ${requirements.estimatedProcessingTime}. Close unnecessary applications.`;
  } else {
    legacyLevel = "light";
    icon = "✅";
    message = `Good: Low resource usage`;
    recommendation = `This file should process smoothly with your selected model.`;
  }
  
  return {
    level: legacyLevel,
    icon,
    message,
    recommendation,
    estimatedRAM: requirements.estimatedRAM,
    estimatedTimeMinutes,
    requiresGPU: requirements.requiresGPU,
    requiresHighEndCPU: requirements.requiresPowerfulCPU,
  };
}

/**
 * Check if audio duration is too long for a model
 * Returns a warning message if duration exceeds model's recommended limit
 */
export function checkAudioDurationLimit(
  audioDurationSec: number,
  modelKey: ModelKey
): { isOverLimit: boolean; warningMessage: string | null; recommendedModel: ModelKey | null } {
  // Fallback to 'small' if model doesn't exist (e.g., removed models)
  const safeModelKey = MODEL_COMPLEXITY[modelKey] ? modelKey : 'small';
  const modelInfo = MODEL_COMPLEXITY[safeModelKey];
  
  if (audioDurationSec <= modelInfo.maxDurationSec) {
    return { isOverLimit: false, warningMessage: null, recommendedModel: null };
  }
  
  const durationMin = Math.round(audioDurationSec / 60);
  const maxMin = Math.round(modelInfo.maxDurationSec / 60);
  
  // Find a model that can handle this duration
  let recommendedModel: ModelKey | null = null;
  for (const [key, info] of Object.entries(MODEL_COMPLEXITY)) {
    if (audioDurationSec <= info.maxDurationSec) {
      recommendedModel = key as ModelKey;
      break;
    }
  }
  
  const warningMessage = `⚠️ ${modelInfo.name} model works best with audio under ${maxMin} minutes. Your audio is ${durationMin} minutes.`;
  
  return {
    isOverLimit: true,
    warningMessage,
    recommendedModel,
  };
}
