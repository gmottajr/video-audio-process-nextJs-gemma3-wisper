/**
 * Audio Segment Metadata Types
 * 
 * Tracks information about extracted audio segments for transcription
 */

export interface AudioSegmentMetadata {
  // Original file information
  originalFileName: string;
  originalFileSize: number;
  originalDuration: number;
  
  // Segment information
  startTime: number;       // seconds
  endTime: number;         // seconds
  duration: number;        // seconds (calculated)
  
  // Extraction metadata
  extractionTimestamp: number;  // Unix timestamp
  segmentSize?: number;         // bytes (if known)
  
  // Optional fields
  transcriptionText?: string;
  userNotes?: string;
  label?: string;
}

/**
 * Create segment metadata from original file and time range
 */
export function createSegmentMetadata(
  originalFile: File,
  startTime: number,
  endTime: number,
  originalDuration: number
): AudioSegmentMetadata {
  return {
    originalFileName: originalFile.name,
    originalFileSize: originalFile.size,
    originalDuration,
    startTime,
    endTime,
    duration: endTime - startTime,
    extractionTimestamp: Date.now(),
  };
}

/**
 * Validate segment times
 * Returns error message if invalid, null if valid
 */
export function validateSegmentTimes(
  duration: number,
  startTime: number,
  endTime: number
): string | null {
  if (startTime < 0) {
    return "Start time cannot be negative";
  }
  
  if (endTime > duration) {
    return `End time (${endTime}s) exceeds audio duration (${duration}s)`;
  }
  
  if (startTime >= endTime) {
    return "Start time must be before end time";
  }
  
  if (endTime - startTime < 0.1) {
    return "Segment must be at least 0.1 seconds long";
  }
  
  return null;
}

/**
 * Format segment label for display
 * Example: "3:00-5:00 (2m 0s)"
 */
export function formatSegmentLabel(metadata: AudioSegmentMetadata): string {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins > 0 && secs > 0) {
      return `${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m`;
    } else {
      return `${secs}s`;
    }
  };
  
  const start = formatTime(metadata.startTime);
  const end = formatTime(metadata.endTime);
  const duration = formatDuration(metadata.duration);
  
  return `${start}-${end} (${duration})`;
}

/**
 * Calculate estimated segment size based on original file
 */
export function estimateSegmentSize(
  originalFileSize: number,
  segmentDuration: number,
  totalDuration: number
): number {
  if (totalDuration === 0) return 0;
  return Math.round((segmentDuration / totalDuration) * originalFileSize);
}

/**
 * Format segment info for display
 */
export function getSegmentInfo(metadata: AudioSegmentMetadata): string {
  const label = formatSegmentLabel(metadata);
  const sizeMB = metadata.segmentSize 
    ? `${(metadata.segmentSize / 1024 / 1024).toFixed(1)}MB`
    : 'unknown size';
  
  return `Segment ${label} - ${sizeMB}`;
}

