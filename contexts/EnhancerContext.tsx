"use client";

/**
 * AI Enhancement Context
 * 
 * Provides state management for the AI transcript enhancement feature.
 * Similar pattern to TranscriberContext but for LLM-based enhancement.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { WorkerManager } from "@/lib/WorkerManager";
import { useHardwareCapabilities } from "@/hooks/useHardwareCapabilities";
import type { 
  EnhancementProgress, 
  EnhancementResult, 
  EnhancementStage,
  HardwareCapabilities 
} from "@/types/enhancement";
import { DEFAULT_MODEL, ENHANCEMENT_MODELS } from "@/types/enhancement";
import { logEnhancementMetrics, type EnhancementTelemetry } from "@/utils/enhancementTelemetry";
import type { TranscriptionResult } from "@/contexts/TranscriberContext";
import type { WhisperMetadata, EnhancementStrategy } from "@/types/whisper-metadata";
import { extractWhisperMetadata } from "@/utils/whisperMetadataExtractor";
import { generateEnhancementStrategy, getStrategySummary } from "@/utils/enhancementStrategyGenerator";
import { buildContextAwarePrompt, buildSimplePrompt } from "@/utils/contextAwarePromptBuilder";
import { chunkTranscript, mergeChunks, getChunkingInfo } from "@/utils/transcriptChunker";
import type { SpeakerIdentificationResult, SpeakerIdentificationOptions } from "@/utils/speakerIdentifier";
import { identifySpeakers } from "@/utils/speakerIdentifier";
import type { TranscriptAnalysis, AnalysisOptions } from "@/types/transcript-analysis";
import { buildAnalysisPrompt, parseAnalysisResponse, validateAnalysisResult } from "@/utils/analysisPromptBuilder";

// ============================================================================
// Download State Persistence
// ============================================================================

const DOWNLOAD_STATE_KEY = 'mediaforge_model_download_state';

interface DownloadState {
  modelId: string;
  startedAt: number;
  progress: number;
  totalMB: number;
  completed: boolean;
}

// ============================================================================
// Context Type Definition
// ============================================================================

interface EnhancerContextType {
  // Hardware capabilities
  capabilities: HardwareCapabilities | null;
  isCheckingHardware: boolean;
  hardwareError: string | null;
  
  // Model state
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  currentModelId: string | null;
  
  // Enhancement state
  isEnhancing: boolean;
  progress: EnhancementProgress | null;
  error: string | null;
  
  // Results
  lastResult: EnhancementResult | null;
  
  // Phase 2: Metadata and Strategy
  lastMetadata: WhisperMetadata | null;
  lastStrategy: EnhancementStrategy | null;
  useContextAwarePrompts: boolean;  // DISABLED: Phase 2 prompts are too large for 1B model
  
  // Download state
  totalDownloadMB: number;
  showResumePrompt: boolean;
  savedDownloadState: DownloadState | null;
  dismissResumePrompt: () => void;
  
  // Speaker Identification
  isIdentifyingSpeakers: boolean;
  speakerIdentificationResult: SpeakerIdentificationResult | null;
  speakerIdentificationError: string | null;
  
  // Transcript Analysis
  isAnalyzing: boolean;
  analysisResult: TranscriptAnalysis | null;
  analysisError: string | null;
  
  // Actions
  loadModel: (modelId?: string) => Promise<void>;
  enhance: (transcript: string, whisperResult?: TranscriptionResult, audioDuration?: number) => Promise<EnhancementResult>;
  identifySpeakersInTranscript: (options: SpeakerIdentificationOptions) => Promise<SpeakerIdentificationResult>;
  analyzeTranscript: (transcript: string, options?: AnalysisOptions) => Promise<TranscriptAnalysis>;
  cancelEnhancement: () => void;
  reset: () => void;
  resetEngine: () => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
  clearSpeakerIdentification: () => void;
  clearAnalysis: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const EnhancerContext = createContext<EnhancerContextType | null>(null);

/**
 * Hook to access the Enhancer context
 * @throws Error if used outside of EnhancerProvider
 */
export function useEnhancerContext() {
  const context = useContext(EnhancerContext);
  if (!context) {
    throw new Error("useEnhancerContext must be used within EnhancerProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if outside provider
 * Useful for conditional rendering
 */
export function useEnhancerContextOptional() {
  return useContext(EnhancerContext);
}

// ============================================================================
// Provider Component
// ============================================================================

interface EnhancerProviderProps {
  children: React.ReactNode;
}

export function EnhancerProvider({ children }: EnhancerProviderProps) {
  // Hardware detection
  const { 
    isChecking: isCheckingHardware, 
    capabilities, 
    error: hardwareError 
  } = useHardwareCapabilities();
  
  // Worker reference
  const workerRef = useRef<WorkerManager | null>(null);
  
  // Model state
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  
  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState<EnhancementProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [lastResult, setLastResult] = useState<EnhancementResult | null>(null);
  
  // Phase 2: Metadata and Strategy
  const [lastMetadata, setLastMetadata] = useState<WhisperMetadata | null>(null);
  const [lastStrategy, setLastStrategy] = useState<EnhancementStrategy | null>(null);
  // TEMP FIX: Disable Phase 2 context-aware prompts - they're too large for 1B model (20K+ tokens)
  // Phase 2 prompts include metadata, strategy, examples which exceed the 4096 token context window
  // TODO: Either use 3B model OR create shorter Phase 2 prompts
  const [useContextAwarePrompts, setUseContextAwarePrompts] = useState(false);
  
  // Speaker Identification
  const [isIdentifyingSpeakers, setIsIdentifyingSpeakers] = useState(false);
  const [speakerIdentificationResult, setSpeakerIdentificationResult] = useState<SpeakerIdentificationResult | null>(null);
  const [speakerIdentificationError, setSpeakerIdentificationError] = useState<string | null>(null);
  
  // Transcript Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TranscriptAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Download state persistence
  const [totalDownloadMB, setTotalDownloadMB] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedDownloadState, setSavedDownloadState] = useState<DownloadState | null>(null);
  
  // Request tracking for cancellation
  const currentRequestIdRef = useRef<string | null>(null);

  // ============================================================================
  // Worker Management
  // ============================================================================

  /**
   * Initialize the worker if not already created
   */
  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      console.log('[EnhancerContext] Initializing worker...');
      try {
        workerRef.current = new WorkerManager('/enhancer.worker.js');
        console.log('[EnhancerContext] Worker initialized');
      } catch (err) {
        console.error('[EnhancerContext] Failed to initialize worker:', err);
        setError('Failed to initialize AI worker');
        throw err;
      }
    }
    return workerRef.current;
  }, []);

  /**
   * Cleanup worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log('[EnhancerContext] Disposing worker on unmount');
        workerRef.current.dispose();
        workerRef.current = null;
      }
    };
  }, []);

  /**
   * Check for interrupted downloads on mount
   */
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(DOWNLOAD_STATE_KEY);
      if (savedState) {
        const state: DownloadState = JSON.parse(savedState);
        // Only show resume prompt if download wasn't completed and was recent (< 24 hours)
        const isRecent = Date.now() - state.startedAt < 24 * 60 * 60 * 1000;
        if (!state.completed && isRecent && state.progress > 0 && state.progress < 100) {
          console.log('[EnhancerContext] Found interrupted download:', state);
          setShowResumePrompt(true);
          setSavedDownloadState(state);
        } else if (state.completed) {
          // Clear completed download state
          localStorage.removeItem(DOWNLOAD_STATE_KEY);
        }
      }
    } catch (err) {
      console.warn('[EnhancerContext] Failed to read download state:', err);
    }
  }, []);

  /**
   * Save download progress to localStorage
   */
  useEffect(() => {
    if (isModelLoading && modelLoadProgress > 0 && currentModelId) {
      try {
        const state: DownloadState = {
          modelId: currentModelId,
          startedAt: Date.now(),
          progress: modelLoadProgress,
          totalMB: totalDownloadMB,
          completed: false,
        };
        localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
      } catch (err) {
        console.warn('[EnhancerContext] Failed to save download state:', err);
      }
    }
  }, [isModelLoading, modelLoadProgress, currentModelId, totalDownloadMB]);

  /**
   * Mark download as completed
   */
  useEffect(() => {
    if (isModelLoaded && currentModelId) {
      try {
        const state: DownloadState = {
          modelId: currentModelId,
          startedAt: Date.now(),
          progress: 100,
          totalMB: totalDownloadMB,
          completed: true,
        };
        localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
        setShowResumePrompt(false);
        setSavedDownloadState(null);
      } catch (err) {
        console.warn('[EnhancerContext] Failed to save completed state:', err);
      }
    }
  }, [isModelLoaded, currentModelId, totalDownloadMB]);

  /**
   * Dismiss resume prompt
   */
  const dismissResumePrompt = useCallback(() => {
    setShowResumePrompt(false);
    setSavedDownloadState(null);
    try {
      localStorage.removeItem(DOWNLOAD_STATE_KEY);
    } catch (err) {
      console.warn('[EnhancerContext] Failed to clear download state:', err);
    }
  }, []);

  // ============================================================================
  // Model Loading
  // ============================================================================

  /**
   * Load the AI model
   * Downloads and caches the model on first use (~1.7GB for Llama 3.2 3B)
   */
  const loadModel = useCallback(async (modelId?: string) => {
    // Check hardware capability
    if (!capabilities?.isCapable) {
      const errorMsg = capabilities?.recommendation.warnings.join(' ') || 'Hardware not capable';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Convert short key to full model ID if needed
    let targetModelId = modelId || capabilities.recommendation.suggestedModel || DEFAULT_MODEL.id;
    
    // If modelId is a short key (e.g., 'llama-3.2-1b'), convert to full ID
    if (modelId && ENHANCEMENT_MODELS[modelId]) {
      targetModelId = ENHANCEMENT_MODELS[modelId].id;
      console.log('[EnhancerContext] Converting model key to full ID:', modelId, '->', targetModelId);
    }

    // Skip if already loaded with same model
    if (isModelLoaded && currentModelId === targetModelId) {
      console.log('[EnhancerContext] Model already loaded:', targetModelId);
      return;
    }

    // Skip if already loading
    if (isModelLoading) {
      console.log('[EnhancerContext] Model loading already in progress');
      return;
    }

    console.log('[EnhancerContext] Loading model:', targetModelId);

    setIsModelLoading(true);
    setIsModelLoaded(false);
    setModelLoadProgress(0);
    setError(null);
    setProgress({
      stage: 'downloading',
      progress: 0,
      message: 'Initializing AI model...',
    });

    try {
      const worker = initWorker();

      await worker.sendRequest('init', { modelId: targetModelId }, {
        timeoutMs: 600000, // 10 minutes for download
        onProgress: (prog, msg, extra) => {
          setModelLoadProgress(prog);
          
          // Track total download size if available
          if (extra?.totalMB) {
            setTotalDownloadMB(extra.totalMB);
          }
          
          // Determine stage based on message
          let stage: EnhancementStage = 'downloading';
          if (msg?.toLowerCase().includes('loading')) {
            stage = 'loading';
          }
          
          setProgress({
            stage,
            progress: prog,
            message: msg || `Downloading: ${prog}%`,
            downloadedMB: extra?.downloadedMB,
            totalMB: extra?.totalMB,
          });
        },
      });

      setIsModelLoaded(true);
      setCurrentModelId(targetModelId);
      setModelLoadProgress(100);
      setProgress({
        stage: 'idle',
        progress: 100,
        message: 'Model ready',
      });

      console.log('[EnhancerContext] Model loaded successfully:', targetModelId);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load model';
      console.error('[EnhancerContext] Model loading failed:', errorMsg);
      
      setError(errorMsg);
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMsg,
      });
      
      throw err;
    } finally {
      setIsModelLoading(false);
    }
  }, [capabilities, isModelLoaded, isModelLoading, currentModelId, initWorker]);

  // ============================================================================
  // Enhancement
  // ============================================================================

  /**
   * Enhance a transcript using the loaded model
   * Phase 2: Now accepts optional Whisper result for context-aware prompting
   */
  const enhance = useCallback(async (
    transcript: string,
    whisperResult?: TranscriptionResult,
    audioDuration?: number
  ): Promise<EnhancementResult> => {
    // Validate model is loaded - check worker directly to avoid React state race condition
    if (!workerRef.current) {
      const errorMsg = 'Worker not initialized. Please wait for initialization.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Note: We don't check isModelLoaded here because it's a React state that might not have
    // updated yet even after loadModel() completes. The worker will handle the check internally.

    // Validate input
    if (!transcript || transcript.trim().length === 0) {
      const errorMsg = 'No transcript provided';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Prevent concurrent enhancements
    if (isEnhancing) {
      const errorMsg = 'Enhancement already in progress';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[EnhancerContext] Starting enhancement...');
    console.log('[EnhancerContext] Transcript length:', transcript.length, 'chars');

    setIsEnhancing(true);
    setError(null);
    setProgress({
      stage: 'processing',
      progress: 0,
      message: 'Analyzing transcript...',
    });

    // Phase 2: Extract metadata and generate strategy
    let metadata: WhisperMetadata | null = null;
    let strategy: EnhancementStrategy | null = null;
    let promptText: string | null;
    
    if (useContextAwarePrompts && whisperResult) {
      try {
        console.log('[EnhancerContext] Phase 2: Extracting metadata from Whisper result...');
        metadata = extractWhisperMetadata(whisperResult, audioDuration);
        setLastMetadata(metadata);
        
        console.log('[EnhancerContext] Metadata extracted:', {
          contentType: metadata.contentType,
          contentTypeConfidence: metadata.contentTypeConfidence,
          fillerDensity: metadata.fillerDensity,
          fillerWordPercentage: `${metadata.fillerWordPercentage.toFixed(1)}%`,
          wordsPerMinute: Math.round(metadata.wordsPerMinute),
          speakingRate: metadata.speakingRateCategory,
          speakerCount: metadata.speakerCount,
          topKeywords: metadata.keywords.topKeywords.slice(0, 5).map(k => k.word),
        });
        
        strategy = generateEnhancementStrategy(metadata);
        setLastStrategy(strategy);
        
        const strategySummary = getStrategySummary(strategy, metadata);
        console.log('[EnhancerContext] Strategy generated:', strategySummary);
        
        // Build context-aware prompt
        promptText = buildContextAwarePrompt({
          metadata,
          strategy,
        });
        
        console.log('[EnhancerContext] Using context-aware prompt for', metadata.contentType, 'content');
        
        setProgress({
          stage: 'processing',
          progress: 5,
          message: `Detected ${metadata.contentType} content. Preparing tailored enhancement...`,
        });
        
      } catch (metadataErr) {
        console.warn('[EnhancerContext] Failed to extract metadata, falling back to Phase 1 (system prompt):', metadataErr);
        // Fall back to Phase 1 (no custom prompt)
        promptText = null;
        setLastMetadata(null);
        setLastStrategy(null);
      }
    } else {
      // Use simple prompt when no Whisper result provided or context-aware disabled
      console.log('[EnhancerContext] Using simple prompt (Phase 1 mode)');
      promptText = null; // Don't pass custom prompt - let worker use built-in system prompt
      setLastMetadata(null);
      setLastStrategy(null);
    }

    try {
      // Check if we need to chunk the transcript
      // SAFE CHUNK SIZE: 2000 tokens max (leaves room for system prompt ~300 + output ~1800 = 4100 total)
      const MAX_CHUNK_TOKENS = 2000;
      const chunkingInfo = getChunkingInfo(transcript.trim(), MAX_CHUNK_TOKENS);
      console.log('[EnhancerContext] Chunking info:', chunkingInfo);
      
      let result: EnhancementResult;
      
      if (chunkingInfo.needsChunking) {
        // Handle long transcripts with chunking
        console.log('[EnhancerContext] Transcript is too long, chunking into', chunkingInfo.estimatedChunks, 'parts');
        
        const chunks = chunkTranscript(transcript.trim(), MAX_CHUNK_TOKENS);
        const enhancedChunks: string[] = [];
        let totalTokens = 0;
        let totalFillerWords = 0;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`[EnhancerContext] Processing chunk ${i + 1}/${chunks.length} (${chunk.text.length} chars)`);
          
          setProgress({
            stage: 'streaming',
            progress: Math.round((i / chunks.length) * 90), // Reserve last 10% for merging
            message: `Processing chunk ${i + 1}/${chunks.length}...`,
          });
          
          const chunkResult = await workerRef.current.sendRequest<EnhancementResult>('enhance', {
            transcript: chunk.text,
            prompt: promptText || undefined, // Pass custom prompt only if generated (Phase 2), otherwise undefined (Phase 1)
            metadata: metadata ? {
              contentType: metadata.contentType,
              fillerDensity: metadata.fillerDensity,
              speakingRate: metadata.speakingRateCategory,
            } : undefined,
          }, {
            timeoutMs: 300000, // 5 minutes for processing
            onProgress: (prog, msg) => {
              const overallProgress = Math.round(((i + prog / 100) / chunks.length) * 90);
              setProgress({
                stage: 'streaming',
                progress: overallProgress,
                message: `Chunk ${i + 1}/${chunks.length}: ${msg || 'Processing...'}`,
              });
            },
          });
          
          enhancedChunks.push(chunkResult.enhancedText);
          totalTokens += chunkResult.tokensGenerated || 0;
          totalFillerWords += chunkResult.improvements?.fillerCount || 0;
        }
        
        // Merge chunks
        console.log('[EnhancerContext] Merging', chunks.length, 'enhanced chunks');
        setProgress({
          stage: 'streaming',
          progress: 95,
          message: 'Combining enhanced chunks...',
        });
        
        const mergedText = mergeChunks(enhancedChunks);
        
        // Calculate combined improvements
        const originalWords = transcript.trim().split(/\s+/).length;
        const enhancedWords = mergedText.split(/\s+/).length;
        const originalChars = transcript.trim().length;
        const enhancedChars = mergedText.length;
        const compressionRatio = enhancedChars / originalChars;
        const reductionPercentage = ((originalChars - enhancedChars) / originalChars) * 100;
        
        result = {
          originalText: transcript.trim(),
          enhancedText: mergedText,
          improvements: {
            fillerWordsRemoved: [],
            fillerCount: totalFillerWords,
            grammarFixes: Math.max(0, Math.floor(Math.abs(originalWords - enhancedWords) * 0.3)),
            originalWordCount: originalWords,
            enhancedWordCount: enhancedWords,
            originalCharCount: originalChars,
            enhancedCharCount: enhancedChars,
            compressionRatio,
            reductionPercentage: Math.max(0, reductionPercentage),
          },
          processingTime: 0, // Will be calculated below
          tokensGenerated: totalTokens,
          modelUsed: currentModelId || 'unknown',
          timestamp: new Date(),
        };
      } else {
        // Single request for short transcripts
        result = await workerRef.current.sendRequest<EnhancementResult>('enhance', {
          transcript: transcript.trim(),
          prompt: promptText || undefined, // Pass custom prompt only if generated (Phase 2), otherwise undefined (Phase 1)
          metadata: metadata ? {
            contentType: metadata.contentType,
            fillerDensity: metadata.fillerDensity,
            speakingRate: metadata.speakingRateCategory,
          } : undefined,
        }, {
          timeoutMs: 300000, // 5 minutes for processing
          onProgress: (prog, msg) => {
            setProgress({
              stage: prog < 100 ? 'streaming' : 'complete',
              progress: prog,
              message: msg || 'Processing...',
            });
          },
        });
      }

      // Convert timestamp string to Date if needed
      const enhancementResult: EnhancementResult = {
        ...result,
        timestamp: typeof result.timestamp === 'string' 
          ? new Date(result.timestamp) 
          : result.timestamp,
      };

      setLastResult(enhancementResult);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Enhancement complete',
      });

      console.log('[EnhancerContext] Enhancement complete');
      console.log('[EnhancerContext] Improvements:', enhancementResult.improvements);
      
      if (metadata) {
        console.log('[EnhancerContext] Phase 2 enhancement used:', {
          contentType: metadata.contentType,
          strategy: strategy ? {
            fillerRemoval: strategy.fillerRemoval,
            grammarCorrection: strategy.grammarCorrection,
            targetFormality: strategy.targetFormality,
          } : null,
        });
      }

      // Log telemetry with Phase 2 data
      if (capabilities) {
        const telemetry: EnhancementTelemetry = {
          modelId: currentModelId || 'unknown',
          gpuTier: capabilities.gpuTier,
          gpuInfo: capabilities.gpuInfo?.description,
          downloadTime: 0, // Model was already loaded
          processingTime: enhancementResult.processingTime,
          transcriptLength: transcript.length,
          enhancedLength: enhancementResult.enhancedText.length,
          fillerWordsRemoved: enhancementResult.improvements.fillerCount,
          tokensGenerated: enhancementResult.tokensGenerated || 0,
          wasCached: true, // Model was loaded, so this is a cached run
          timestamp: new Date().toISOString(),
        };
        logEnhancementMetrics(telemetry);
      }

      return enhancementResult;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Enhancement failed';
      console.error('[EnhancerContext] Enhancement failed:', errorMsg);
      
      setError(errorMsg);
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMsg,
      });
      
      throw err;
    } finally {
      setIsEnhancing(false);
      currentRequestIdRef.current = null;
    }
  }, [isModelLoaded, isEnhancing, useContextAwarePrompts, capabilities, currentModelId]);

  // ============================================================================
  // Cancellation
  // ============================================================================

  /**
   * Cancel ongoing enhancement
   */
  const cancelEnhancement = useCallback(() => {
    if (!isEnhancing || !workerRef.current) {
      return;
    }

    console.log('[EnhancerContext] Cancelling enhancement...');

    workerRef.current.sendRequest('cancel', {}, { timeoutMs: 5000 })
      .catch(err => console.warn('[EnhancerContext] Cancel request failed:', err));

    setIsEnhancing(false);
    setProgress({
      stage: 'cancelled',
      progress: 0,
      message: 'Enhancement cancelled',
    });
  }, [isEnhancing]);

  // ============================================================================
  // Reset & Cleanup
  // ============================================================================

  /**
   * Full reset - unload model and clear all state
   */
  /**
   * Reset engine and clear cache
   * Use this when the engine is corrupted/hung
   */
  const resetEngine = useCallback(async () => {
    console.log('[EnhancerContext] Resetting engine and clearing cache...');

    // Cancel any ongoing operation
    if (isEnhancing) {
      cancelEnhancement();
    }

    // Reset worker with cache clearing
    if (workerRef.current) {
      try {
        await workerRef.current.sendRequest('reset', {}, { timeoutMs: 30000 });
        console.log('[EnhancerContext] Engine reset complete');
      } catch (err) {
        console.error('[EnhancerContext] Reset request failed:', err);
      }
    }

    // Reset all state
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setCurrentModelId(null);
    setIsEnhancing(false);
    setProgress(null);
    setError(null);
    setLastResult(null);
    setLastMetadata(null);
    setLastStrategy(null);
    setSpeakerIdentificationResult(null);
    setSpeakerIdentificationError(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  }, [isEnhancing, cancelEnhancement]);

  const reset = useCallback(() => {
    console.log('[EnhancerContext] Resetting...');

    // Cancel any ongoing operation
    if (isEnhancing) {
      cancelEnhancement();
    }

    // Reset worker
    if (workerRef.current) {
      workerRef.current.sendRequest('reset', {}, { timeoutMs: 5000 })
        .catch(err => console.warn('[EnhancerContext] Reset request failed:', err));
    }

    // Reset all state
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setCurrentModelId(null);
    setIsEnhancing(false);
    setProgress(null);
    setError(null);
    setLastResult(null);
  }, [isEnhancing, cancelEnhancement]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear last result
   */
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  /**
   * Clear speaker identification results
   */
  const clearSpeakerIdentification = useCallback(() => {
    setSpeakerIdentificationResult(null);
    setSpeakerIdentificationError(null);
  }, []);

  // ============================================================================
  // Speaker Identification
  // ============================================================================

  /**
   * Identify speakers in transcript using AI
   */
  const identifySpeakersInTranscript = useCallback(async (
    options: SpeakerIdentificationOptions
  ): Promise<SpeakerIdentificationResult> => {
    console.log('[EnhancerContext] Starting speaker identification...', { mode: options.mode });

    // Validate model is loaded
    if (!isModelLoaded) {
      const msg = 'Model must be loaded before identifying speakers';
      setSpeakerIdentificationError(msg);
      throw new Error(msg);
    }

    // Validate we're not already identifying
    if (isIdentifyingSpeakers) {
      const msg = 'Speaker identification already in progress';
      setSpeakerIdentificationError(msg);
      throw new Error(msg);
    }

    setIsIdentifyingSpeakers(true);
    setSpeakerIdentificationError(null);
    setSpeakerIdentificationResult(null);

    try {
      const worker = initWorker();

      // Create LLM generation function using the worker
      const llmGenerate = async (prompt: string): Promise<string> => {
        console.log('[EnhancerContext] Generating speaker identification response...');
        
        const result = await worker.sendRequest('generate', {
          prompt,
          temperature: 0.3, // Lower temperature for more consistent speaker detection
          max_tokens: 2000,
        }, {
          timeoutMs: 120000, // 2 minutes
        });

        return result.text || '';
      };

      // Run speaker identification
      const result = await identifySpeakers(options, llmGenerate);

      setSpeakerIdentificationResult(result);
      console.log('[EnhancerContext] Speaker identification complete:', {
        identified: result.speakerMap.size,
        warnings: result.warnings.length,
      });

      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Speaker identification failed';
      console.error('[EnhancerContext] Speaker identification failed:', errorMsg);
      
      setSpeakerIdentificationError(errorMsg);
      throw err;
    } finally {
      setIsIdentifyingSpeakers(false);
    }
  }, [isModelLoaded, isIdentifyingSpeakers, initWorker]);

  // ============================================================================
  // Transcript Analysis
  // ============================================================================

  /**
   * Analyze transcript using AI to extract insights
   */
  const analyzeTranscript = useCallback(async (
    transcript: string,
    options: AnalysisOptions = {}
  ): Promise<TranscriptAnalysis> => {
    console.log('[EnhancerContext] Starting transcript analysis...');

    // Validate model is loaded
    if (!isModelLoaded) {
      const msg = 'Model must be loaded before analyzing transcript';
      setAnalysisError(msg);
      throw new Error(msg);
    }

    // Validate we're not already analyzing
    if (isAnalyzing) {
      const msg = 'Analysis already in progress';
      setAnalysisError(msg);
      throw new Error(msg);
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const startTime = Date.now();

    try {
      const worker = initWorker();

      // Build analysis prompt
      const prompt = buildAnalysisPrompt(transcript, options);

      console.log('[EnhancerContext] Sending analysis request to LLM...');

      // Send to LLM
      const result = await worker.sendRequest('generate', {
        prompt,
        temperature: 0.3, // Lower temperature for structured analysis
        max_tokens: 4000, // Need more tokens for comprehensive analysis
      }, {
        timeoutMs: 180000, // 3 minutes for complex analysis
      });

      const responseText = result.text || '';

      // Parse LLM response
      console.log('[EnhancerContext] Parsing analysis response...');
      const parsedAnalysis = parseAnalysisResponse(responseText);

      // Validate structure
      if (!validateAnalysisResult(parsedAnalysis)) {
        throw new Error('Invalid analysis result structure');
      }

      // Add processing time and metadata
      const processingTime = (Date.now() - startTime) / 1000; // Convert to seconds
      
      const finalAnalysis: TranscriptAnalysis = {
        ...parsedAnalysis,
        processingTime,
        modelId: currentModelId || 'unknown',
      };

      setAnalysisResult(finalAnalysis);
      
      console.log('[EnhancerContext] Analysis complete:', {
        keyPoints: finalAnalysis.keyPoints.length,
        questions: finalAnalysis.questionsRaised.total,
        processingTime: processingTime.toFixed(1) + 's',
      });

      return finalAnalysis;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
      console.error('[EnhancerContext] Analysis failed:', errorMsg);
      
      setAnalysisError(errorMsg);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isModelLoaded, isAnalyzing, currentModelId, initWorker]);

  /**
   * Clear analysis results
   */
  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: EnhancerContextType = {
    // Hardware
    capabilities,
    isCheckingHardware,
    hardwareError,
    
    // Model state
    isModelLoaded,
    isModelLoading,
    modelLoadProgress,
    currentModelId,
    
    // Enhancement state
    isEnhancing,
    progress,
    error,
    
    // Results
    lastResult,
    
    // Phase 2: Metadata and Strategy
    lastMetadata,
    lastStrategy,
    useContextAwarePrompts,
    
    // Speaker Identification
    isIdentifyingSpeakers,
    speakerIdentificationResult,
    speakerIdentificationError,
    
    // Transcript Analysis
    isAnalyzing,
    analysisResult,
    analysisError,
    
    // Download state
    totalDownloadMB,
    showResumePrompt,
    savedDownloadState,
    dismissResumePrompt,
    
    // Actions
    loadModel,
    enhance,
    identifySpeakersInTranscript,
    analyzeTranscript,
    cancelEnhancement,
    reset,
    resetEngine,
    clearError,
    clearResult,
    clearSpeakerIdentification,
    clearAnalysis,
  };

  return (
    <EnhancerContext.Provider value={value}>
      {children}
    </EnhancerContext.Provider>
  );
}

