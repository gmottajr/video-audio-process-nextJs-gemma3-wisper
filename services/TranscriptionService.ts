/**
 * Transcription Service
 * 
 * Handles transcription workflows including:
 * - Blob URL validation and fetching
 * - Audio file creation
 * - Transcription processing
 * 
 * Separates business logic from UI components.
 */

import { fetchBlobSafely } from "@/utils/blobValidation";
import { BlobURLError, ValidationError, errorHandler } from "./ErrorHandlingService";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { CompressionType } from "@/components/ActionSelector";
import type { ModelKey } from "@/components/ModelSelector";

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  modelKey: ModelKey;
  compressionType: CompressionType;
  normalizeAudio: boolean;
  testMode?: boolean;
}

/**
 * Processor interface (to avoid circular dependencies)
 * Uses 'any' to avoid tight coupling with useMediaProcessor return type
 */
export interface MediaProcessorInterface {
  processFile: (
    file: File,
    action: any,
    formatId: string,
    options: any
  ) => Promise<ProcessingResult>;
}

/**
 * Transcription Service
 * 
 * Handles the business logic for transcribing audio from
 * extraction/conversion results.
 */
export class TranscriptionService {
  constructor(private processor: MediaProcessorInterface) {}

  /**
   * Transcribe audio from a processing result
   * 
   * This is the main entry point for "transcribe from done" functionality.
   * Handles validation, blob fetching, file creation, and processing.
   */
  async transcribeFromResult(
    result: ProcessingResult | null,
    originalFilename: string | undefined,
    options: TranscriptionOptions
  ): Promise<ProcessingResult> {
    console.log("[TranscriptionService] Starting transcription from result");

    // Step 1: Validate the result
    this.validateAudioResult(result);

    // Step 2: Fetch the audio blob safely
    const audioBlob = await this.fetchAudioBlob(result!.blobUrl!);

    // Step 3: Create an audio file
    const audioFile = this.createAudioFile(audioBlob, originalFilename);

    // Step 4: Process the transcription
    console.log("[TranscriptionService] Processing transcription with options:", {
      modelKey: options.modelKey,
      compressionType: options.compressionType,
      normalizeAudio: options.normalizeAudio,
    });

    const transcriptionResult = await this.processor.processFile(
      audioFile,
      "transcribe",
      "",
      {
        modelKey: options.modelKey,
        testMode: options.testMode || false,
        normalizeAudio: options.normalizeAudio,
        compressionType: options.compressionType,
      }
    );

    console.log("[TranscriptionService] Transcription completed successfully");
    return transcriptionResult;
  }

  /**
   * Validate that the result is a valid audio result with a blob URL
   */
  private validateAudioResult(result: ProcessingResult | null): void {
    errorHandler.validate(
      result !== null,
      "No audio result available. Please extract or convert audio first.",
      "result"
    );

    errorHandler.validate(
      result!.type === "audio",
      "Result is not an audio file. Only audio results can be transcribed.",
      "result.type"
    );

    if (!result!.blobUrl) {
      throw new BlobURLError("Audio file URL is missing. The file may have been cleared from memory.");
    }

    // Validate blob URL format
    if (!result!.blobUrl.startsWith("blob:")) {
      throw new BlobURLError("Invalid audio file URL format.");
    }

    console.log("[TranscriptionService] Audio result validation passed");
  }

  /**
   * Fetch audio blob from URL with comprehensive error handling
   */
  private async fetchAudioBlob(blobUrl: string): Promise<Blob> {
    console.log("[TranscriptionService] Fetching audio blob from:", blobUrl);

    try {
      // Use the utility function from blobValidation.ts
      const blob = await fetchBlobSafely(blobUrl);
      
      console.log("[TranscriptionService] Audio blob fetched successfully:", {
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        type: blob.type,
      });

      return blob;
    } catch (error) {
      errorHandler.logError(error, "Blob fetch failed");
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new BlobURLError(
          `Failed to load audio file: ${error.message}`
        );
      }
      throw new BlobURLError("Failed to load audio file from memory");
    }
  }

  /**
   * Create a File object from the blob
   */
  private createAudioFile(blob: Blob, originalFilename?: string): File {
    // Generate filename
    const filename = originalFilename || "audio.wav";
    
    // Ensure audio MIME type
    const mimeType = blob.type || "audio/wav";

    const file = new File([blob], filename, { type: mimeType });

    console.log("[TranscriptionService] Audio file created:", {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
    });

    return file;
  }
}

