/**
 * Video Format Configuration
 * 
 * Follows Open/Closed Principle:
 * - Open for extension (add new formats)
 * - Closed for modification (no changes to consumer code)
 */

export interface VideoFormatConfig {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  videoCodec: string;
  audioCodec: string;
  ffmpegArgs: string[];
  description?: string;
  quality?: string;
  qualityLevel?: 'high' | 'medium' | 'low';
  supportsRemux?: boolean; // If true, can use -c copy for same codec
  estimatedSpeed?: string; // e.g., "Fast", "Medium", "Slow"
  badge?: string; // e.g., "HEVC", "Best Quality", "Fastest"
}

/**
 * Supported Video Formats
 * 
 * To add a new format, simply add an entry here.
 * Consumer code doesn't need to change.
 */
export const SUPPORTED_VIDEO_FORMATS: VideoFormatConfig[] = [
  // ========== MP4 (H.264) - Quality Variants ==========
  {
    id: "mp4-high",
    name: "MP4 (High Quality)",
    extension: ".mp4",
    mimeType: "video/mp4",
    videoCodec: "H.264",
    audioCodec: "AAC",
    ffmpegArgs: ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart"],
    description: "Best quality MP4 - larger file size",
    quality: "High Quality",
    qualityLevel: "high",
    supportsRemux: true,
    estimatedSpeed: "Slow (best quality)",
    badge: "Best Quality",
  },
  {
    id: "mp4",
    name: "MP4 (Balanced)",
    extension: ".mp4",
    mimeType: "video/mp4",
    videoCodec: "H.264",
    audioCodec: "AAC",
    ffmpegArgs: ["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    description: "Balanced quality and file size",
    quality: "Balanced",
    qualityLevel: "medium",
    supportsRemux: true,
    estimatedSpeed: "Medium",
    badge: "Recommended",
  },
  {
    id: "mp4-low",
    name: "MP4 (Compressed)",
    extension: ".mp4",
    mimeType: "video/mp4",
    videoCodec: "H.264",
    audioCodec: "AAC",
    ffmpegArgs: ["-c:v", "libx264", "-preset", "fast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"],
    description: "Smaller file size - good for sharing",
    quality: "Compressed",
    qualityLevel: "low",
    supportsRemux: false,
    estimatedSpeed: "Fast",
    badge: "Small Size",
  },
  
  // ========== MP4 (H.265/HEVC) - Better Compression ==========
  {
    id: "mp4-hevc",
    name: "MP4 (HEVC/H.265)",
    extension: ".mp4",
    mimeType: "video/mp4",
    videoCodec: "H.265",
    audioCodec: "AAC",
    ffmpegArgs: ["-c:v", "libx265", "-preset", "medium", "-crf", "28", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    description: "50% smaller files than H.264 (slower encoding)",
    quality: "High Efficiency",
    qualityLevel: "medium",
    supportsRemux: false,
    estimatedSpeed: "Very Slow",
    badge: "HEVC - 50% Smaller",
  },
  
  // ========== WebM (VP9) - Quality Variants ==========
  {
    id: "webm-high",
    name: "WebM (High Quality)",
    extension: ".webm",
    mimeType: "video/webm",
    videoCodec: "VP9",
    audioCodec: "Opus",
    ffmpegArgs: ["-c:v", "libvpx-vp9", "-crf", "25", "-b:v", "0", "-c:a", "libopus", "-b:a", "192k"],
    description: "Best WebM quality - open source",
    quality: "High Quality",
    qualityLevel: "high",
    supportsRemux: false,
    estimatedSpeed: "Slow",
    badge: "Open Source",
  },
  {
    id: "webm",
    name: "WebM (Balanced)",
    extension: ".webm",
    mimeType: "video/webm",
    videoCodec: "VP9",
    audioCodec: "Opus",
    ffmpegArgs: ["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k"],
    description: "Balanced WebM - web optimized",
    quality: "Balanced",
    qualityLevel: "medium",
    supportsRemux: false,
    estimatedSpeed: "Medium",
  },
  {
    id: "webm-low",
    name: "WebM (Compressed)",
    extension: ".webm",
    mimeType: "video/webm",
    videoCodec: "VP9",
    audioCodec: "Opus",
    ffmpegArgs: ["-c:v", "libvpx-vp9", "-crf", "35", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k"],
    description: "Small WebM files - good for web",
    quality: "Compressed",
    qualityLevel: "low",
    supportsRemux: false,
    estimatedSpeed: "Fast",
    badge: "Web Optimized",
  },
  
  // ========== AVI (Legacy) ==========
  {
    id: "avi",
    name: "AVI",
    extension: ".avi",
    mimeType: "video/x-msvideo",
    videoCodec: "MPEG-4",
    audioCodec: "MP3",
    ffmpegArgs: ["-c:v", "mpeg4", "-q:v", "5", "-c:a", "libmp3lame", "-b:a", "192k"],
    description: "Legacy format - wide compatibility",
    quality: "Good",
    qualityLevel: "medium",
    supportsRemux: false,
    estimatedSpeed: "Fast",
    badge: "Legacy",
  },
  
  // ========== MOV (QuickTime) ==========
  {
    id: "mov",
    name: "MOV (QuickTime)",
    extension: ".mov",
    mimeType: "video/quicktime",
    videoCodec: "H.264",
    audioCodec: "AAC",
    ffmpegArgs: ["-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    description: "Apple QuickTime format",
    quality: "High",
    qualityLevel: "high",
    supportsRemux: false,
    estimatedSpeed: "Medium",
    badge: "Apple",
  },
];

/**
 * Resolution Scaling Options
 */
export interface ResolutionConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
  ffmpegScale: string; // FFmpeg -vf scale argument
}

export const RESOLUTION_OPTIONS: ResolutionConfig[] = [
  {
    id: "original",
    name: "Original",
    width: -1,
    height: -1,
    description: "Keep original resolution",
    ffmpegScale: "", // No scaling
  },
  {
    id: "1080p",
    name: "1080p (Full HD)",
    width: 1920,
    height: 1080,
    description: "High quality - 1920x1080",
    ffmpegScale: "scale=1920:1080:force_original_aspect_ratio=decrease",
  },
  {
    id: "720p",
    name: "720p (HD)",
    width: 1280,
    height: 720,
    description: "Good quality - 1280x720",
    ffmpegScale: "scale=1280:720:force_original_aspect_ratio=decrease",
  },
  {
    id: "480p",
    name: "480p (SD)",
    width: 854,
    height: 480,
    description: "Standard definition - 854x480",
    ffmpegScale: "scale=854:480:force_original_aspect_ratio=decrease",
  },
  {
    id: "360p",
    name: "360p",
    width: 640,
    height: 360,
    description: "Low size - 640x360",
    ffmpegScale: "scale=640:360:force_original_aspect_ratio=decrease",
  },
];

/**
 * Get resolution configuration by ID
 */
export function getResolutionById(id: string): ResolutionConfig | undefined {
  return RESOLUTION_OPTIONS.find((res) => res.id === id);
}

/**
 * Get format configuration by ID
 * 
 * @param id Format ID (e.g., 'mp4', 'webm')
 * @returns Format configuration or undefined
 */
export function getVideoFormatById(id: string): VideoFormatConfig | undefined {
  return SUPPORTED_VIDEO_FORMATS.find((format) => format.id === id);
}

/**
 * Get all video format IDs
 * 
 * @returns Array of format IDs
 */
export function getVideoFormatIds(): string[] {
  return SUPPORTED_VIDEO_FORMATS.map((format) => format.id);
}

/**
 * Check if format is supported
 * 
 * @param id Format ID
 * @returns True if format exists
 */
export function isVideoFormatSupported(id: string): boolean {
  return SUPPORTED_VIDEO_FORMATS.some((format) => format.id === id);
}

/**
 * Get default video format (MP4)
 * 
 * @returns Default format configuration
 */
export function getDefaultVideoFormat(): VideoFormatConfig {
  return SUPPORTED_VIDEO_FORMATS.find((format) => format.id === "mp4")!;
}

/**
 * Check if input file can be remuxed to target format (fast container swap)
 * 
 * @param inputFile Input file
 * @param targetFormatId Target format ID
 * @returns True if remux is possible (instant conversion)
 */
export function canRemux(inputFile: File, targetFormatId: string): boolean {
  const targetFormat = getVideoFormatById(targetFormatId);
  if (!targetFormat || !targetFormat.supportsRemux) return false;

  // Check if input is MKV
  const isMKV = inputFile.name.toLowerCase().endsWith(".mkv") || 
                inputFile.type === "video/x-matroska";

  // MKV to MP4 remux is common (MKV often contains H.264/AAC)
  if (isMKV && targetFormatId === "mp4") {
    return true;
  }

  return false;
}

