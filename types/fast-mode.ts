/**
 * Type definitions for Fast Transcription Mode (Parallel Audio Chunking)
 * 
 * All types are isolated to the fast-mode implementation and do not
 * modify existing transcription types.
 */

/**
 * Transcription mode selection
 */
export type TranscriptionMode = 'standard' | 'fast';

/**
 * Device preference for AI inference acceleration
 * - 'auto': Automatically select best available (NPU > GPU > CPU)
 * - 'npu': Prefer NPU via WebNN (experimental)
 * - 'gpu': Prefer GPU via WebGPU
 * - 'cpu': Use CPU via WASM (most compatible)
 */
export type DevicePreference = 'auto' | 'npu' | 'gpu' | 'cpu';

/**
 * Audio chunk with metadata for parallel processing
 */
export interface AudioChunk {
  /** Zero-based index of chunk in sequence */
  index: number;
  /** Audio samples (Float32Array, 16kHz mono) */
  audioData: Float32Array;
  /** Start offset in seconds from beginning of original audio */
  startOffset: number;
  /** End offset in seconds from beginning of original audio */
  endOffset: number;
  /** Duration of chunk in seconds */
  duration: number;
}

/**
 * Result from processing a single chunk
 */
export interface ChunkResult {
  /** Zero-based index of chunk */
  chunkIndex: number;
  /** Transcribed text for this chunk */
  text: string;
  /** Segments with timestamps (relative to chunk start) */
  segments: ChunkSegment[];
  /** Processing time in milliseconds */
  processingTime: number;
  /** Start offset in seconds (from original audio) */
  startOffset: number;
  /** End offset in seconds (from original audio) */
  endOffset: number;
}

/**
 * Segment within a chunk (sentence-level timestamps)
 */
export interface ChunkSegment {
  /** Start time in seconds (relative to chunk start) */
  start: number;
  /** End time in seconds (relative to chunk start) */
  end: number;
  /** Transcribed text for this segment */
  text: string;
}

/**
 * Worker message protocol
 */
export interface WorkerMessage {
  /** Message type */
  type: 'init' | 'transcribe' | 'terminate' | 'init-complete' | 'progress' | 'result' | 'error';
  /** Unique request ID for tracking */
  requestId: string;
  /** Message data (varies by type) */
  data?: any;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /** Minimum number of workers (default: 1) */
  minWorkers: number;
  /** Maximum number of workers (default: 2) */
  maxWorkers: number;
  /** Memory threshold in MB to trigger worker reduction (default: 1200) */
  memoryThresholdMB: number;
}

/**
 * Fast mode configuration
 */
export interface FastModeConfig {
  /** Chunk length in seconds (default: 30) */
  chunkLengthSec: number;
  /** Overlap between chunks in seconds (default: 3) */
  overlapSec: number;
  /** Model ID to use (default: distil-whisper/distil-small.en) */
  modelId: string;
  /** Sample rate (fixed at 16000 for Whisper) */
  sampleRate: number;
  /** Device preference for inference (default: 'auto') */
  devicePreference: DevicePreference;
}

/**
 * Transcription progress information
 */
export interface FastModeProgress {
  /** Current phase */
  phase: 'idle' | 'initializing' | 'processing' | 'merging' | 'complete' | 'error';
  /** Overall progress percentage (0-100) */
  percent: number;
  /** Number of chunks completed */
  chunksCompleted: number;
  /** Total number of chunks */
  chunksTotal: number;
  /** Number of active workers */
  workersActive: number;
  /** Estimated time remaining in seconds */
  etaSeconds?: number;
}

/**
 * Final transcription result from fast mode
 */
export interface FastModeTranscriptionResult {
  /** Full transcribed text */
  text: string;
  /** Segments with absolute timestamps */
  segments: TranscriptionSegment[];
  /** Total duration in seconds */
  duration: number;
  /** Mode used */
  mode: 'fast';
  /** Processing time in milliseconds */
  processingTime: number;
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Number of workers used */
  workersUsed: number;
}

/**
 * Transcription segment with absolute timestamps
 */
export interface TranscriptionSegment {
  /** Start time in seconds (absolute, from audio start) */
  start: number;
  /** End time in seconds (absolute, from audio start) */
  end: number;
  /** Transcribed text */
  text: string;
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'crashed' | 'terminated';

/**
 * Worker pool status
 */
export interface WorkerPoolStatus {
  /** Total number of workers */
  total: number;
  /** Number of idle workers */
  idle: number;
  /** Number of busy workers */
  busy: number;
  /** Number of crashed workers */
  crashed: number;
  /** Worker statuses by index */
  workers: WorkerStatus[];
}
