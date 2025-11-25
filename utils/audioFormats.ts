/**
 * Audio Format Configuration
 * 
 * Follows Open/Closed Principle:
 * - Open for extension (add new formats)
 * - Closed for modification (no changes to consumer code)
 */

export interface AudioFormatConfig {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  ffmpegArgs: string[];
  description?: string;
  quality?: string;
}

/**
 * Supported Audio Formats
 * 
 * To add a new format, simply add an entry here.
 * Consumer code doesn't need to change.
 */
export const SUPPORTED_AUDIO_FORMATS: AudioFormatConfig[] = [
  {
    id: "mp3",
    name: "MP3",
    extension: ".mp3",
    mimeType: "audio/mpeg",
    ffmpegArgs: ["-acodec", "libmp3lame", "-q:a", "2"],
    description: "MPEG Audio Layer 3",
    quality: "High (VBR ~190 kbps)",
  },
  {
    id: "wav",
    name: "WAV",
    extension: ".wav",
    mimeType: "audio/wav",
    ffmpegArgs: ["-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2"],
    description: "Waveform Audio File Format",
    quality: "Lossless (CD Quality)",
  },
  {
    id: "aac",
    name: "AAC (M4A)",
    extension: ".m4a",
    mimeType: "audio/mp4",
    ffmpegArgs: ["-acodec", "aac", "-b:a", "192k"],
    description: "Advanced Audio Coding",
    quality: "High (192 kbps)",
  },
  {
    id: "ogg",
    name: "OGG Vorbis",
    extension: ".ogg",
    mimeType: "audio/ogg",
    ffmpegArgs: ["-acodec", "libvorbis", "-q:a", "5"],
    description: "Ogg Vorbis Audio",
    quality: "High (VBR ~160 kbps)",
  },
];

/**
 * Get format configuration by ID
 * 
 * @param id Format ID (e.g., 'mp3', 'wav')
 * @returns Format configuration or undefined
 */
export function getFormatById(id: string): AudioFormatConfig | undefined {
  return SUPPORTED_AUDIO_FORMATS.find((format) => format.id === id);
}

/**
 * Get all format IDs
 * 
 * @returns Array of format IDs
 */
export function getFormatIds(): string[] {
  return SUPPORTED_AUDIO_FORMATS.map((format) => format.id);
}

/**
 * Get file extension from filename
 * 
 * @param filename File name
 * @returns Extension with dot (e.g., '.mp3') or empty string
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.substring(lastDot).toLowerCase();
}

/**
 * Check if format is supported
 * 
 * @param id Format ID
 * @returns True if format exists
 */
export function isFormatSupported(id: string): boolean {
  return SUPPORTED_AUDIO_FORMATS.some((format) => format.id === id);
}

/**
 * Get format by file extension
 * 
 * @param extension Extension with or without dot (e.g., '.mp3' or 'mp3')
 * @returns Format configuration or undefined
 */
export function getFormatByExtension(extension: string): AudioFormatConfig | undefined {
  const normalizedExt = extension.startsWith(".") ? extension : `.${extension}`;
  return SUPPORTED_AUDIO_FORMATS.find((format) => format.extension === normalizedExt);
}

/**
 * Get default format (WAV - lossless)
 * 
 * @returns Default format configuration
 */
export function getDefaultFormat(): AudioFormatConfig {
  return SUPPORTED_AUDIO_FORMATS.find((format) => format.id === "wav")!;
}

/**
 * Detect file type from MIME type
 * 
 * @param file File object
 * @returns 'video' | 'audio' | 'unknown'
 */
export function detectFileType(file: File): "video" | "audio" | "unknown" {
  // Check MIME type first
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "video/x-matroska") return "video"; // MKV explicit check
  if (file.type.startsWith("audio/")) return "audio";
  
  // Fallback to extension
  const ext = getFileExtension(file.name).toLowerCase();
  if ([".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v", ".flv"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".aac", ".ogg", ".m4a", ".flac"].includes(ext)) return "audio";
  
  return "unknown";
}

/**
 * Get recommended formats based on file type
 * 
 * @param fileType File type ('video' | 'audio')
 * @returns Array of recommended format configs
 */
export function getRecommendedFormats(fileType: "video" | "audio" | "unknown"): AudioFormatConfig[] {
  if (fileType === "video") {
    // For video: prioritize lossless extraction
    return [
      SUPPORTED_AUDIO_FORMATS.find((f) => f.id === "wav")!,
      SUPPORTED_AUDIO_FORMATS.find((f) => f.id === "mp3")!,
      SUPPORTED_AUDIO_FORMATS.find((f) => f.id === "aac")!,
    ];
  }
  
  // For audio: all formats
  return SUPPORTED_AUDIO_FORMATS;
}

