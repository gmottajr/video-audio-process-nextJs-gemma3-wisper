/**
 * Audio Segment Extraction Utility
 * 
 * Extracts specific time segments from audio files using FFmpeg.wasm
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

/**
 * Extract a segment from an audio blob
 * 
 * @param audioBlob - Source audio blob
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param ffmpeg - Optional FFmpeg instance (will create new if not provided)
 * @returns Blob containing only the extracted segment
 * 
 * @example
 * const segment = await extractAudioSegment(fullAudioBlob, 180, 300);
 * // Extracts 2 minutes from 3:00 to 5:00
 */
export async function extractAudioSegment(
  audioBlob: Blob,
  startTime: number,
  endTime: number,
  ffmpeg?: FFmpeg
): Promise<Blob> {
  console.log(`[AudioExtraction] Extracting segment: ${startTime}s to ${endTime}s`);
  
  // Validate inputs
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("Invalid audio blob: empty or null");
  }
  
  if (startTime < 0) {
    throw new Error("Start time cannot be negative");
  }
  
  if (endTime <= startTime) {
    throw new Error("End time must be greater than start time");
  }
  
  const duration = endTime - startTime;
  
  if (duration < 0.1) {
    throw new Error("Segment duration must be at least 0.1 seconds");
  }
  
  // Use provided FFmpeg instance or create new one
  const ffmpegInstance = ffmpeg || new FFmpeg();
  let shouldCleanup = false;
  
  try {
    // Load FFmpeg if not already loaded
    if (!ffmpegInstance.loaded) {
      console.log("[AudioExtraction] Loading FFmpeg...");
      await ffmpegInstance.load({
        coreURL: "/ffmpeg/ffmpeg-core.js",
        wasmURL: "/ffmpeg/ffmpeg-core.wasm",
      });
      shouldCleanup = true;
    }
    
    // Prepare input file
    const inputFileName = "input.wav";
    const outputFileName = "output.wav";
    
    console.log("[AudioExtraction] Writing input file...");
    await ffmpegInstance.writeFile(inputFileName, await fetchFile(audioBlob));
    
    // Extract segment using FFmpeg
    // -ss: start time
    // -t: duration (not end time!)
    // -c copy: fast extraction without re-encoding
    const command = [
      "-i", inputFileName,
      "-ss", startTime.toString(),
      "-t", duration.toString(),
      "-c", "copy",
      outputFileName
    ];
    
    console.log("[AudioExtraction] Executing FFmpeg command:", command.join(" "));
    await ffmpegInstance.exec(command);
    
    // Read output file
    console.log("[AudioExtraction] Reading output file...");
    const outputData = await ffmpegInstance.readFile(outputFileName);
    
    // Create blob from output
    const outputBlob = new Blob([outputData], { type: "audio/wav" });
    
    console.log(`[AudioExtraction] Segment extracted successfully: ${outputBlob.size} bytes`);
    
    // Cleanup temporary files
    try {
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);
      console.log("[AudioExtraction] Temporary files cleaned up");
    } catch (cleanupError) {
      console.warn("[AudioExtraction] Failed to cleanup temporary files:", cleanupError);
    }
    
    return outputBlob;
    
  } catch (error) {
    console.error("[AudioExtraction] Extraction failed:", error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("not loaded")) {
        throw new Error("FFmpeg failed to load. Please refresh the page and try again.");
      } else if (error.message.includes("Invalid")) {
        throw new Error(`Invalid audio file: ${error.message}`);
      } else if (error.message.includes("timed out")) {
        throw new Error("Extraction timed out. Please try a shorter segment.");
      }
    }
    
    throw new Error(`Failed to extract audio segment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
  } finally {
    // Cleanup FFmpeg instance if we created it
    if (shouldCleanup && ffmpegInstance.loaded) {
      // Note: We don't terminate here as it might be reused
      // The caller should manage FFmpeg lifecycle
    }
  }
}

/**
 * Extract audio segment from a URL
 * Convenience method that fetches the audio first
 */
export async function extractAudioSegmentFromUrl(
  audioUrl: string,
  startTime: number,
  endTime: number,
  ffmpeg?: FFmpeg
): Promise<Blob> {
  console.log(`[AudioExtraction] Fetching audio from URL: ${audioUrl}`);
  
  try {
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    
    return await extractAudioSegment(audioBlob, startTime, endTime, ffmpeg);
    
  } catch (error) {
    console.error("[AudioExtraction] Failed to fetch audio:", error);
    throw new Error(`Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate segment extraction parameters
 * Returns null if valid, error message if invalid
 */
export function validateExtractionParams(
  startTime: number,
  endTime: number,
  audioDuration?: number
): string | null {
  if (startTime < 0) {
    return "Start time cannot be negative";
  }
  
  if (endTime <= startTime) {
    return "End time must be greater than start time";
  }
  
  if (audioDuration !== undefined && endTime > audioDuration) {
    return `End time (${endTime}s) exceeds audio duration (${audioDuration}s)`;
  }
  
  const duration = endTime - startTime;
  if (duration < 0.1) {
    return "Segment must be at least 0.1 seconds long";
  }
  
  if (duration > 3600) {
    return "Segment cannot exceed 1 hour";
  }
  
  return null;
}

