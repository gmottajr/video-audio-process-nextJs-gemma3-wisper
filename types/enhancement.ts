/**
 * AI Enhancement Types
 * 
 * TypeScript interfaces for the Gemma/Llama AI transcript enhancement feature.
 * Uses WebLLM for browser-based inference with WebGPU acceleration.
 */

/**
 * Hardware capabilities detection result
 */
export interface HardwareCapabilities {
  /** Whether WebGPU is supported in the browser */
  webGpuSupported: boolean;
  
  /** GPU performance tier based on detected hardware */
  gpuTier: 'high' | 'medium' | 'low' | 'unsupported';
  
  /** GPU adapter information from WebGPU API */
  gpuInfo: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  } | null;
  
  /** Estimated VRAM in GB (from adapter limits) */
  estimatedVRAM: number;
  
  /** Device memory from navigator API (may be null/capped at 8GB) */
  deviceMemory: number | null;
  
  /** Number of logical CPU cores */
  cpuCores: number;
  
  /** Overall capability to run enhancement */
  isCapable: boolean;
  
  /** Recommendation for the user */
  recommendation: {
    canRun: boolean;
    suggestedModel: string;
    estimatedLoadTime: string;
    estimatedProcessTime: string;
    warnings: string[];
  };
}

/**
 * Enhancement processing stages
 */
export type EnhancementStage =
  | 'idle'
  | 'checking-hardware'
  | 'downloading'
  | 'loading'
  | 'processing'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Enhancement progress during processing
 */
export interface EnhancementProgress {
  /** Current processing stage */
  stage: EnhancementStage;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Human-readable status message */
  message: string;
  
  /** Downloaded megabytes (during download stage) */
  downloadedMB?: number;
  
  /** Total megabytes to download */
  totalMB?: number;
  
  /** Number of tokens generated so far */
  tokensGenerated?: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Detected improvement in the transcript
 */
export interface TranscriptImprovement {
  /** Type of improvement made */
  type: 'filler_removed' | 'grammar_fix' | 'punctuation' | 'formatting';
  
  /** Original text that was changed */
  original: string;
  
  /** New text after improvement */
  replacement: string;
  
  /** Position in original text */
  position?: number;
}

/**
 * Enhancement result after processing
 */
export interface EnhancementResult {
  /** Original transcript text */
  originalText: string;
  
  /** Enhanced transcript text */
  enhancedText: string;
  
  /** Detailed improvement metrics */
  improvements: {
    /** List of filler words that were removed */
    fillerWordsRemoved: string[];
    
    /** Total count of filler words removed */
    fillerCount: number;
    
    /** Estimated grammar fixes (based on edit distance) */
    grammarFixes: number;
    
    /** Word count in original text */
    originalWordCount: number;
    
    /** Word count in enhanced text */
    enhancedWordCount: number;
    
    /** Character count in original text */
    originalCharCount: number;
    
    /** Character count in enhanced text */
    enhancedCharCount: number;
    
    /** Compression ratio (enhanced/original length) */
    compressionRatio: number;
    
    /** Percentage reduction in text */
    reductionPercentage: number;
  };
  
  /** Processing time in seconds */
  processingTime: number;
  
  /** Tokens generated during processing */
  tokensGenerated: number;
  
  /** Model ID used for enhancement */
  modelUsed: string;
  
  /** Timestamp when enhancement completed */
  timestamp: Date;
}

/**
 * Options for the enhance function
 */
export interface EnhanceOptions {
  /** The transcript text to enhance */
  transcript: string;
  
  /** Optional callback for progress updates */
  onProgress?: (progress: EnhancementProgress) => void;
  
  /** Optional signal to cancel the operation */
  signal?: AbortSignal;
}

/**
 * Enhanced transcription result
 * Combines raw Whisper output with optional AI enhancement
 */
export interface EnhancedTranscriptionResult {
  /** Raw transcription from Whisper */
  raw: {
    text: string;
    chunks?: Array<{
      text: string;
      timestamp: [number, number | null];
    }>;
  };
  
  /** Enhanced version (if processed) */
  enhanced?: EnhancementResult;
  
  /** Which version is currently being displayed */
  activeVersion: 'raw' | 'enhanced';
}

/**
 * Worker message types for communication
 */
export type EnhancerWorkerMessageType = 'init' | 'enhance' | 'reset' | 'cancel';

/**
 * Worker request message structure
 */
export interface EnhancerWorkerRequest {
  requestId: string;
  type: EnhancerWorkerMessageType;
  data?: {
    modelId?: string;
    transcript?: string;
  };
}

/**
 * Worker response status types
 */
export type EnhancerWorkerStatus =
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled'
  | 'reset';

/**
 * Worker response message structure
 */
export interface EnhancerWorkerResponse {
  requestId: string;
  status: EnhancerWorkerStatus;
  message?: string;
  progress?: number;
  downloadedMB?: number;
  totalMB?: number;
  tokensGenerated?: number;
  result?: EnhancementResult;
  error?: string;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  name: string;
  size: string;
  description: string;
  minVRAM: number;
  recommendedTier: HardwareCapabilities['gpuTier'];
}

/**
 * Available models for enhancement
 * 
 * NOTE: All models use q4f32 (32-bit float) quantization for maximum compatibility.
 * The f16 (half-precision) variants require the WebGPU f16 extension which is not
 * universally supported. f32 models work on all WebGPU-capable devices.
 */
export const ENHANCEMENT_MODELS: Record<string, ModelConfig> = {
  'llama-3.2-3b': {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~1.8GB',
    description: 'Best quality, recommended for most users. Use 3B for speaker identification and analysis',
    minVRAM: 4,
    recommendedTier: 'medium',
  },
  'llama-3.2-1b': {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~0.7GB',
    description: 'Good balance of quality and speed',
    minVRAM: 2,
    recommendedTier: 'low',
  },
  'qwen-0.5b': {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 0.5B',
    size: '~0.4GB',
    description: 'Fastest, good for basic enhancement',
    minVRAM: 1,
    recommendedTier: 'low',
  },
  'smollm2-360m': {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    name: 'SmolLM2 360M',
    size: '~0.25GB',
    description: 'Ultra-fast, minimal model for quick fixes',
    minVRAM: 1,
    recommendedTier: 'low',
  },
} as const;

/**
 * Default model to use (3B for better speaker identification and analysis)
 */
export const DEFAULT_MODEL = ENHANCEMENT_MODELS['llama-3.2-3b'];



