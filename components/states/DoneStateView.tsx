"use client";

import { useState, useEffect, useCallback } from "react";
import { WaveformViewer, WaveformSelection } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { TabbedTranscriptionView } from "@/components/TabbedTranscriptionView";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { StatisticsModal } from "@/components/StatisticsModal";
import { TranscribeFromDoneForm } from "@/components/TranscribeFromDoneForm";
import { ResourceComparison } from "@/components/ResourceComparison";
import { EnhancementProgress } from "@/components/EnhancementProgress";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { Download, RotateCcw, BarChart3, Scissors, Sparkles, Check } from "lucide-react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { CompressionType } from "@/components/ActionSelector";
import { PageHeader } from "@/components/PageHeader";
import { extractAudioSegmentFromUrl } from "@/utils/audioExtraction";
import { createSegmentMetadata, formatSegmentLabel, estimateSegmentSize } from "@/types/audioSegment";
import { getResourceRequirements } from "@/utils/resourceEstimation";
import { useEnhancerContextOptional } from "@/contexts/EnhancerContext";
import type { EnhancementResult } from "@/types/enhancement";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";
import { calculateEnhancementQualityMetrics } from "@/utils/qualityMetricsCalculator";
import { recordEnhancement } from "@/utils/enhancementHistoryManager";
import { saveFeedback } from "@/utils/feedbackManager";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { TranscriptFormattingControls } from "@/components/TranscriptFormattingControls";
import { SpeakerIdentificationInput, type SpeakerNames } from "@/components/SpeakerIdentificationInput";
import { SpeakerEditModal } from "@/components/SpeakerEditModal";
import { TranscriptionMediaPlayer } from "@/components/TranscriptionMediaPlayer";
import { formatEnhancedTranscriptWithSpeakers, formatTranscriptWithSpeakers, type FormattingOptions } from "@/utils/speakerFormatter";
import { getSpeakerIdentificationSummary } from "@/utils/speakerIdentifier";

interface DoneStateViewProps {
  result: ProcessingResult;
  file: File;
  formatId: string | null;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  metrics: any;
  memoryUsageMB: number;
  onDownload: () => void;
  onReset: () => void;
  // Transcription options (NEW)
  isModelLoaded?: boolean;
  isModelLoading?: boolean;
  modelLoadingProgress?: number;
  onModelSelect?: (modelKey: ModelKey) => void;
  onTranscribe?: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey, segmentFile?: File) => void;
  // Processing metrics
  processingStartTime?: number | null;
  processingEndTime?: number | null;
}

/**
 * DONE State View
 * Shows processing results with preview and download
 */
export function DoneStateView({
  result,
  file,
  formatId,
  selectedModelKey,
  currentModel,
  metrics,
  memoryUsageMB,
  onDownload,
  onReset,
  isModelLoaded = false,
  isModelLoading = false,
  modelLoadingProgress = 0,
  onModelSelect,
  onTranscribe,
  processingStartTime,
  processingEndTime,
}: DoneStateViewProps) {
  // Statistics modal state
  const [showStats, setShowStats] = useState(false);
  
  // Waveform selection state
  const [waveformSelection, setWaveformSelection] = useState<WaveformSelection | null>(null);
  
  // Segment transcription state
  const [isExtractingSegment, setIsExtractingSegment] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [segmentModelKey, setSegmentModelKey] = useState<ModelKey>(selectedModelKey);
  const [segmentCompressionType, setSegmentCompressionType] = useState<CompressionType>("none");
  const [segmentNormalizeAudio, setSegmentNormalizeAudio] = useState(false);
  
  // AI Enhancement state
  const [enhancedResult, setEnhancedResult] = useState<EnhancementResult | null>(null);
  
  // Phase 3: Quality metrics and feedback
  const [qualityMetrics, setQualityMetrics] = useState<EnhancementQualityMetrics | null>(null);
  const [enhancementId, setEnhancementId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Transcript formatting options
  const [formattingOptions, setFormattingOptions] = useState<FormattingOptions>({
    includeTimestamps: false,
    includeSpeakerLabels: true,
    speakerDetectionSensitivity: 'medium',
  });
  
  // Speaker identification state
  const [speakerNames, setSpeakerNames] = useState<SpeakerNames>({
    mode: 'auto',
    useAIDetection: true,
  });
  
  const [isIdentifyingSpeakers, setIsIdentifyingSpeakers] = useState(false);
  const [showSpeakerEditModal, setShowSpeakerEditModal] = useState(false);
  
  // Create blob URL for original media (for transcription results)
  const [originalMediaUrl, setOriginalMediaUrl] = useState<string | null>(null);
  
  // Get enhancer context (optional - may not be available)
  const enhancer = useEnhancerContextOptional();
  
  // Create blob URL from original file for transcription results
  useEffect(() => {
    if (result.type === "transcription" && file) {
      const url = URL.createObjectURL(file);
      setOriginalMediaUrl(url);
      
      // Cleanup on unmount
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [result.type, file]);
  
  // Debug logging for enhancement capability
  useEffect(() => {
    if (result.type === "transcription") {
      console.log('[DoneStateView] Enhancement Debug:', {
        enhancerExists: !!enhancer,
        isCheckingHardware: enhancer?.isCheckingHardware,
        capabilities: enhancer?.capabilities,
        isCapable: enhancer?.capabilities?.isCapable,
        webGpuSupported: enhancer?.capabilities?.webGpuSupported,
        gpuTier: enhancer?.capabilities?.gpuTier,
        hardwareError: enhancer?.hardwareError,
      });
    }
  }, [result.type, enhancer]);
  
  const format =
    result.type === "audio"
      ? getFormatById(formatId || "")
      : result.type === "video"
      ? getVideoFormatById(formatId || "")
      : null;
  
  // Calculate segment resource estimates
  const getSegmentResources = () => {
    if (!waveformSelection || !result.blobUrl || !metrics) return null;
    
    const segmentDuration = waveformSelection.endTime - waveformSelection.startTime;
    const totalDuration = metrics.duration || 1;
    const segmentSize = estimateSegmentSize(file.size, segmentDuration, totalDuration);
    
    // Get RAM estimates using getResourceRequirements
    const fullRAM = getResourceRequirements(file.size, selectedModelKey, "transcribe");
    const segmentRAM = getResourceRequirements(segmentSize, selectedModelKey, "transcribe");
    
    return {
      fullAudio: {
        size: file.size,
        duration: totalDuration,
        ramEstimate: fullRAM.estimatedRAM,
        timeEstimate: totalDuration,
      },
      segment: {
        size: segmentSize,
        duration: segmentDuration,
        ramEstimate: segmentRAM.estimatedRAM,
        timeEstimate: segmentDuration,
      },
    };
  };
  
  // Handle transcribe segment
  const handleTranscribeSegment = async () => {
    if (!waveformSelection || !result.blobUrl || !onTranscribe) {
      return;
    }
    
    setIsExtractingSegment(true);
    setExtractionError(null);
    
    try {
      console.log('[DoneStateView] Extracting segment:', {
        start: waveformSelection.startTime,
        end: waveformSelection.endTime,
      });
      
      // Extract segment from audio
      const segmentBlob = await extractAudioSegmentFromUrl(
        result.blobUrl,
        waveformSelection.startTime,
        waveformSelection.endTime
      );
      
      console.log('[DoneStateView] Segment extracted:', {
        size: segmentBlob.size,
        type: segmentBlob.type,
      });
      
      // Create metadata
      const metadata = createSegmentMetadata(
        file,
        waveformSelection.startTime,
        waveformSelection.endTime,
        metrics?.duration || 0
      );
      
      // Create File object from blob
      const segmentFile = new File(
        [segmentBlob],
        `${file.name.split('.')[0]}_segment_${Math.floor(waveformSelection.startTime)}-${Math.floor(waveformSelection.endTime)}.wav`,
        { type: 'audio/wav' }
      );
      
      console.log('[DoneStateView] Segment file created:', segmentFile.name);
      
      // Store segment metadata in a way that can be passed through
      // We'll need to enhance the transcription service to accept this
      (segmentFile as any).segmentMetadata = metadata;
      
      // Call transcription with segment file using selected options
      onTranscribe(segmentCompressionType, segmentNormalizeAudio, segmentModelKey, segmentFile);
      
      // Clear selection after starting transcription
      setWaveformSelection(null);
      
    } catch (error) {
      console.error('[DoneStateView] Segment extraction failed:', error);
      setExtractionError(
        error instanceof Error 
          ? error.message 
          : 'Failed to extract audio segment'
      );
    } finally {
      setIsExtractingSegment(false);
    }
  };
  
  // Handle enhancement - triggered by button click
  const handleEnhancementToggle = async (enabled: boolean) => {
    // Only proceed if we have a transcription and enhancer is available
    if (enabled && result.type === "transcription" && result.transcription?.text && enhancer) {
      const startTime = Date.now();
      
      try {
        // Force Llama 3.2 3B for better speaker identification and analysis
        // Always load the correct model, even if a different model is already loaded
        const targetModelId = 'Llama-3.2-3B-Instruct-q4f32_1-MLC';
        
        console.log('[DoneStateView] Current model:', enhancer.currentModelId);
        console.log('[DoneStateView] Target model:', targetModelId);
        
        // Load model if not loaded or if wrong model is loaded
        if (!enhancer.isModelLoaded || enhancer.currentModelId !== targetModelId) {
          console.log('[DoneStateView] Loading/reloading model...');
          await enhancer.loadModel('llama-3.2-3b'); // Use the key, not the full ID
        } else {
          console.log('[DoneStateView] Correct model already loaded');
        }
        
        // Run enhancement with Whisper result for context-aware prompting (Phase 2)
        // Pass the full transcription result and audio duration for metadata extraction
        const enhancementResult = await enhancer.enhance(
          result.transcription.text,
          result.transcription,  // Pass full Whisper result for metadata extraction
          metrics?.duration       // Pass audio duration
        );
        setEnhancedResult(enhancementResult);
        
        const processingTimeMs = Date.now() - startTime;
        
        // Phase 3: Calculate quality metrics
        const calculatedMetrics = calculateEnhancementQualityMetrics(
          result.transcription.text,
          enhancementResult.enhancedText,
          enhancementResult.improvements?.fillerCount || 0
        );
        setQualityMetrics(calculatedMetrics);
        
        console.log('[DoneStateView] Quality metrics calculated:', {
          qualityScore: calculatedMetrics.qualityScore,
          confidenceScore: calculatedMetrics.confidenceScore,
          readabilityImprovement: calculatedMetrics.readabilityImprovement,
        });
        
        // Phase 3: Record enhancement in history
        const contentType = enhancer.lastMetadata?.contentType || 'unknown';
        const record = recordEnhancement(calculatedMetrics, {
          contentType,
          modelId: enhancer.currentModelId || 'unknown',
          processingTimeMs,
        });
        
        if (record) {
          setEnhancementId(record.id);
          console.log('[DoneStateView] Enhancement recorded:', record.id);
          
          // Show feedback panel after 2 seconds
          setTimeout(() => {
            setShowFeedback(true);
          }, 2000);
        }
        
        // Log Phase 2 metadata if available
        if (enhancer.lastMetadata) {
          console.log('[DoneStateView] Phase 2 Enhancement used:', {
            contentType: enhancer.lastMetadata.contentType,
            fillerDensity: enhancer.lastMetadata.fillerDensity,
            speakingRate: enhancer.lastMetadata.speakingRateCategory,
          });
        }
      } catch (error) {
        console.error('[DoneStateView] Enhancement failed:', error);
        // Error is handled by the enhancer context
      }
    }
  };
  
  // Handle enhancement cancellation
  const handleCancelEnhancement = () => {
    if (enhancer) {
      enhancer.cancelEnhancement();
    }
  };
  
  // Phase 3: Handle feedback submission
  const handleFeedbackSubmit = useCallback((feedback: {
    rating: 1 | 2 | 3 | 4 | 5;
    issues?: any[];
    comments?: string;
  }) => {
    if (enhancementId) {
      const success = saveFeedback(enhancementId, feedback);
      if (success) {
        setFeedbackSubmitted(true);
        console.log('[DoneStateView] Feedback submitted for:', enhancementId);
      }
    }
  }, [enhancementId]);
  
  // Phase 3: Handle feedback panel close
  const handleFeedbackClose = useCallback(() => {
    setShowFeedback(false);
  }, []);
  
  // Phase 4: Handle re-enhancement request
  const handleReEnhance = useCallback(() => {
    // Reset enhancement state to allow re-enhancement
    setEnhancedResult(null);
    setQualityMetrics(null);
    setEnhancementId(null);
    setFeedbackSubmitted(false);
    setShowFeedback(false);
  }, []);
  
  // Handle AI Analysis
  const handleAnalyze = useCallback(async () => {
    if (!enhancer || !result.transcription) return;
    
    // Prevent concurrent requests - check if speaker identification is running
    if (isIdentifyingSpeakers) {
      console.log('[DoneStateView] Skipping analysis - speaker identification is running');
      return;
    }
    
    try {
      // Make sure model is loaded
      if (!enhancer.isModelLoaded) {
        await enhancer.loadModel('llama-3.2-3b'); // Use 3B for better analysis
      }
      
      // Run analysis on the enhanced text if available, otherwise original
      const textToAnalyze = enhancedResult?.enhancedText || result.transcription.text;
      
      await enhancer.analyzeTranscript(textToAnalyze, {
        contentType: enhancer.lastMetadata?.contentType || 'general',
        depth: 'standard',
      });
      
      console.log('[DoneStateView] Analysis complete');
      
    } catch (error) {
      console.error('[DoneStateView] Analysis failed:', error);
    }
  }, [enhancer, result.transcription, enhancedResult, isIdentifyingSpeakers]);
  
  // Auto-trigger analysis after enhancement completes
  useEffect(() => {
    if (
      enhancedResult &&
      enhancer?.isModelLoaded &&
      !enhancer.isAnalyzing &&
      !enhancer.analysisResult &&
      !enhancer.analysisError
    ) {
      console.log('[DoneStateView] Auto-triggering analysis after enhancement');
      handleAnalyze();
    }
  }, [enhancedResult, enhancer?.isModelLoaded, enhancer?.isAnalyzing, enhancer?.analysisResult, enhancer?.analysisError, handleAnalyze]);
  
  // Handle speaker identification
  const handleIdentifySpeakers = useCallback(async () => {
    if (!enhancer || !result.transcription) return;
    
    // Prevent concurrent requests - check if analysis or enhancement is running
    if (enhancer.isAnalyzing || enhancer.isEnhancing) {
      alert('Please wait for the current AI operation to complete before identifying speakers.');
      return;
    }
    
    setIsIdentifyingSpeakers(true);
    
    try {
      // Make sure model is loaded
      if (!enhancer.isModelLoaded) {
        await enhancer.loadModel('llama-3.2-3b'); // Use 3B for better speaker identification
      }
      
      // Run speaker identification
      const identificationResult = await enhancer.identifySpeakersInTranscript({
        mode: speakerNames.mode,
        firstSpeaker: speakerNames.firstSpeaker,
        allSpeakers: speakerNames.allSpeakers,
        useAIDetection: speakerNames.useAIDetection,
        transcript: result.transcription.text,
        speakerTurns: undefined,
      });
      
      // Update formatting options with identified speaker names
      setFormattingOptions(prev => ({
        ...prev,
        speakerNames: identificationResult.speakerMap,
      }));
      
      const summary = getSpeakerIdentificationSummary(identificationResult);
      console.log('[DoneStateView] Speaker identification complete:', {
        identified: summary.identifiedCount,
        unknown: summary.unknownCount,
        averageConfidence: summary.averageConfidence.toFixed(2),
        speakerMap: Object.fromEntries(identificationResult.speakerMap),
        transcript_sample: result.transcription.text.substring(0, 500),
      });
      
      // Show warnings if any
      if (identificationResult.warnings.length > 0) {
        console.warn('[DoneStateView] Speaker identification warnings:', identificationResult.warnings);
      }
      
      // Alert user with results
      const speakerList = Array.from(identificationResult.speakerMap.entries())
        .map(([label, name]) => `${label} → ${name}`)
        .join('\n');
      
      alert(`✅ Speaker Identification Complete!\n\nIdentified Speakers:\n${speakerList || 'No speakers identified'}\n\nWarnings: ${identificationResult.warnings.length}`);
    
      
    } catch (error) {
      console.error('[DoneStateView] Speaker identification failed:', error);
    } finally {
      setIsIdentifyingSpeakers(false);
    }
  }, [enhancer, result.transcription, speakerNames]);
  
  // Automatically identify speakers when conditions are met
  // Note: Speaker identification is now triggered explicitly via the "Identify Speakers" button
  // This prevents unnecessary processing on every keystroke
  
  // Check if enhancement is available
  const canEnhance = enhancer?.capabilities?.isCapable && result.type === "transcription" && result.transcription?.text;
  
  // Determine if we should show the progress overlay
  const showEnhancementProgress = enhancer && (enhancer.isModelLoading || enhancer.isEnhancing) && enhancer.progress;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Main Title & Subtitle */}
      <PageHeader 
        subtitle="Processing Complete"
        description={
          result.type === "audio"
            ? "Your audio file is ready. Listen to the preview or download it."
            : result.type === "video"
            ? "Your video file is ready. Preview it or download it."
            : "Your transcription is ready. View the text or download it."
        }
        icon="✓"
      />

      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {/* Show compression status badges */}
        {result.metadata?.compressionType && result.metadata.compressionType !== "none" && (
          <>
            {result.metadata.compressionType === "speech" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-950/50 to-emerald-950/50 border border-green-500/40 rounded-full text-sm animate-in fade-in duration-300 shadow-lg shadow-green-500/10">
                <span className="text-green-400 font-bold text-base">🎙️</span>
                <span className="text-green-200 font-semibold">
                  Speech Compressed
                </span>
              </div>
            )}
            {result.metadata.compressionType === "studio" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-950/50 to-cyan-950/50 border border-blue-500/40 rounded-full text-sm animate-in fade-in duration-300 shadow-lg shadow-blue-500/10">
                <span className="text-blue-400 font-bold text-base">🎚️</span>
                <span className="text-blue-200 font-semibold">
                  Studio Compressed
                </span>
              </div>
            )}
            {result.metadata.compressionType === "both" && (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-950/50 via-pink-950/50 to-orange-950/50 border-2 border-purple-500/40 rounded-full text-sm animate-in fade-in duration-300 shadow-xl shadow-purple-500/20">
                <span className="text-orange-400 font-bold text-base">✨</span>
                <span className="text-purple-200 font-bold">
                  Full Enhancement
                </span>
                <span className="text-xs text-purple-300 bg-purple-500/30 px-2 py-0.5 rounded-full">
                  Speech + Studio
                </span>
              </div>
            )}
          </>
        )}
        
        {/* Show normalization status badge */}
        {result.metadata?.normalized && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/40 rounded-full text-sm animate-in fade-in duration-300 shadow-lg shadow-cyan-500/10">
            <span className="text-cyan-400 font-bold text-base">🎵</span>
            <span className="text-cyan-200 font-semibold">
              Normalized
            </span>
          </div>
        )}
      </div>

      {/* Output Preview */}
      <div className="mb-6">
        {result.type === "audio" && result.blobUrl ? (
          <>
            <WaveformViewer 
              audioUrl={result.blobUrl}
              selectable={true}
              onSelectionChange={setWaveformSelection}
            />
            
            {/* Segment Selection Info & Transcribe */}
            {waveformSelection && (
              <div className="mt-6 space-y-4">
                {/* Segment Info Card */}
                <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Scissors className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-100">
                          Segment Selected
                        </h3>
                        <p className="text-sm text-blue-300/70 mt-1">
                          {formatSegmentLabel(createSegmentMetadata(
                            file,
                            waveformSelection.startTime,
                            waveformSelection.endTime,
                            metrics?.duration || 0
                          ))}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setWaveformSelection(null)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                  
                  {/* Resource Comparison */}
                  {getSegmentResources() && (
                    <ResourceComparison
                      fullAudio={getSegmentResources()!.fullAudio}
                      segment={getSegmentResources()!.segment}
                    />
                  )}
                  
                  {/* Model Selection for Segment */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Select Whisper Model
                    </label>
                    <ModelSelector
                      selectedModel={segmentModelKey}
                      currentlyLoadedModel={currentModel}
                      isLoading={isModelLoading}
                      onModelSelect={(key) => {
                        setSegmentModelKey(key);
                        if (onModelSelect) onModelSelect(key);
                      }}
                    />
                  </div>
                  
                  {/* Enhancement Options for Segment */}
                  <div className="mt-4 space-y-3">
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Audio Enhancement (Optional)
                    </label>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-900/70 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={segmentCompressionType === "speech"}
                          onChange={(e) => setSegmentCompressionType(e.target.checked ? "speech" : "none")}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-zinc-200">Speech Compression</span>
                          <p className="text-xs text-zinc-500">Optimize for voice (meetings, calls)</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-900/70 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={segmentNormalizeAudio}
                          onChange={(e) => setSegmentNormalizeAudio(e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-zinc-200">Normalize Audio</span>
                          <p className="text-xs text-zinc-500">Balance volume levels</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Transcribe Segment Button */}
                  <div className="mt-4">
                    <button
                      onClick={handleTranscribeSegment}
                      disabled={isExtractingSegment || !onTranscribe || isModelLoading || !isModelLoaded}
                      className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                    >
                      {isExtractingSegment ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Extracting Segment...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Transcribe Selection
                        </>
                      )}
                    </button>
                    
                    {extractionError && (
                      <div className="mt-3 p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-sm text-red-300">
                        <strong>Error:</strong> {extractionError}
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-center text-blue-300/60">
                      💡 Only the selected segment will be transcribed, saving time and RAM
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : result.type === "video" && result.blobUrl ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                🎬 Video Preview
              </h3>
              <p className="text-sm text-zinc-400">
                Preview your converted video file
              </p>
            </div>
            <video
              src={result.blobUrl}
              controls
              className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl bg-black"
              style={{ maxHeight: "500px" }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : result.type === "transcription" && result.transcription ? (
          <>
            {/* Original Media Player - NEW: Show audio/video for validation */}
            {originalMediaUrl && (
              <TranscriptionMediaPlayer
                file={file}
                mediaUrl={originalMediaUrl}
                mediaType={file.type.startsWith('video/') ? 'video' : 'audio'}
                metrics={{
                  duration: metrics?.duration,
                  size: file.size,
                }}
                defaultCollapsed={false}
              />
            )}

            {/* Phase 4: Tabbed Transcription View (shown when enhancement is complete) */}
            {enhancedResult ? (
              <div className="space-y-4">
                {/* Formatting Controls */}
                <TranscriptFormattingControls
                  options={formattingOptions}
                  onChange={setFormattingOptions}
                />
                
                {/* Speaker Identification Input */}
                {formattingOptions.includeSpeakerLabels && enhancer?.isModelLoaded && (
                  <>
                    <SpeakerIdentificationInput
                      onSubmit={(names) => {
                        setSpeakerNames(names);
                        // Trigger identification when user clicks the button
                        handleIdentifySpeakers();
                      }}
                      initialNames={speakerNames}
                      speakerCount={
                        result.transcription?.text 
                          ? (result.transcription.text.match(/Speaker \d+/g) || []).filter((v, i, a) => a.indexOf(v) === i).length || 2
                          : 2
                      }
                      disabled={isIdentifyingSpeakers || enhancer?.isAnalyzing || enhancer?.isEnhancing}
                    />
                    {(isIdentifyingSpeakers || enhancer?.isAnalyzing) && (
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg text-sm">
                        <div className="flex items-center gap-2 text-purple-300">
                          <div className="animate-spin">⏳</div>
                          <span>
                            {enhancer?.isAnalyzing 
                              ? 'Analyzing transcript... Please wait before identifying speakers.' 
                              : 'Identifying speakers...'}
                          </span>
                        </div>
                      </div>
                    )}
                    {formattingOptions.speakerNames && formattingOptions.speakerNames.size > 0 && (
                      <div className="p-3 bg-green-950/20 border border-green-500/30 rounded-lg text-sm">
                        <div className="flex items-center gap-2 text-green-300 mb-2">
                          <span>✅</span>
                          <span className="font-medium">Speakers Identified</span>
                        </div>
                        <div className="text-xs text-green-400/80 space-y-1">
                          {Array.from(formattingOptions.speakerNames.entries()).map(([label, name]) => (
                            <div key={label}>{label} → {name}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Speaker Identification Status */}
                {isIdentifyingSpeakers && (
                  <div className="flex items-center gap-2 p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg text-sm text-purple-300">
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <span>Identifying speakers...</span>
                  </div>
                )}
                
                {/* Speaker Identification Summary */}
                {formattingOptions.speakerNames && !isIdentifyingSpeakers && enhancer?.speakerIdentificationResult && (
                  <div className="p-3 bg-green-950/20 border border-green-500/30 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-green-300">
                        <span>✓</span>
                        <span className="font-medium">Speaker Identification Complete</span>
                      </div>
                      <button
                        onClick={() => setShowSpeakerEditModal(true)}
                        className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3" />
                        Edit Names
                      </button>
                    </div>
                    {(() => {
                      const summary = getSpeakerIdentificationSummary(enhancer.speakerIdentificationResult);
                      return (
                        <div className="text-xs text-green-400/80 space-y-1">
                          <p>• Identified: {summary.identifiedCount} speakers</p>
                          {summary.unknownCount > 0 && (
                            <p>• Unknown: {summary.unknownCount} speakers</p>
                          )}
                          <p>• Average Confidence: {(summary.averageConfidence * 100).toFixed(0)}%</p>
                        </div>
                      );
                    })()}
                    {enhancer.speakerIdentificationResult.warnings.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-green-500/20">
                        <p className="text-xs text-yellow-400 font-medium mb-1">⚠️ Warnings:</p>
                        <ul className="text-xs text-yellow-400/80 space-y-0.5 list-disc list-inside">
                          {enhancer.speakerIdentificationResult.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* AI Analysis Button */}
                {enhancer?.isModelLoaded && !enhancer.isAnalyzing && (
                  <button
                    onClick={handleAnalyze}
                    disabled={enhancer.isAnalyzing}
                    className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                  >
                    {enhancer.analysisResult ? (
                      <>
                        <Check className="w-5 h-5" />
                        View AI Analysis
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Analyze Transcript
                      </>
                    )}
                  </button>
                )}
                
                {/* Analysis Status */}
                {enhancer?.isAnalyzing && (
                  <div className="flex items-center gap-2 p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-sm text-indigo-300">
                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span>Analyzing transcript... This may take a minute.</span>
                  </div>
                )}
                
                {/* Analysis Error */}
                {enhancer?.analysisError && (
                  <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2 text-red-300 mb-2">
                      <span>❌</span>
                      <span className="font-medium">Analysis Failed</span>
                    </div>
                    <p className="text-xs text-red-400/80">{enhancer.analysisError}</p>
                    <button
                      onClick={handleAnalyze}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Retry Analysis
                    </button>
                  </div>
                )}
                
                <TabbedTranscriptionView
                  originalText={
                    formattingOptions.includeSpeakerLabels || formattingOptions.includeTimestamps
                      ? formatTranscriptWithSpeakers(result.transcription.text, result.transcription, formattingOptions)
                      : result.transcription.text
                  }
                  enhancedText={
                    formattingOptions.includeSpeakerLabels || formattingOptions.includeTimestamps
                      ? formatEnhancedTranscriptWithSpeakers(enhancedResult.enhancedText, result.transcription, formattingOptions)
                      : enhancedResult.enhancedText
                  }
                  qualityMetrics={qualityMetrics}
                  processingTime={enhancedResult.processingTime}
                  chunks={result.transcription.chunks}
                  metadata={{
                    contentType: enhancer?.lastMetadata?.contentType,
                    duration: metrics?.duration,
                    modelName: currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined,
                    filename: file.name.split(".")[0],
                  }}
                  analysis={enhancer?.analysisResult}
                  isAnalyzing={enhancer?.isAnalyzing}
                  analysisError={enhancer?.analysisError}
                  onReEnhance={handleReEnhance}
                  onAnalysisRetry={handleAnalyze}
                />
              </div>
            ) : (
              /* Show basic transcription view before enhancement */
              <>
                <TranscriptionViewer result={result.transcription} />
                
                {/* AI Enhancement Button - Only show if capable and not already enhanced */}
                {enhancer && enhancer.capabilities?.isCapable && !enhancer.isCheckingHardware && (
                  <div className="mt-6">
                    <button
                      onClick={() => handleEnhancementToggle(true)}
                      disabled={enhancer.isEnhancing || enhancer.isModelLoading}
                      className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold text-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-2xl hover:shadow-purple-500/25"
                    >
                      {enhancer.isModelLoading ? (
                        <>
                          <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading AI Model... ({enhancer.modelLoadProgress}%)
                        </>
                      ) : enhancer.isEnhancing ? (
                        <>
                          <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          Enhancing Transcript...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          Enhance Transcript with AI
                        </>
                      )}
                    </button>
                    
                    {/* Info text */}
                    <div className="mt-3 text-center text-sm text-zinc-400">
                      <p>✨ Remove filler words, fix grammar, improve readability</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Uses {enhancer.capabilities.recommendation.modelName} • Runs locally in your browser
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Show why enhancement is unavailable */}
            {enhancer && !enhancer.isCheckingHardware && enhancer.capabilities && !enhancer.capabilities.isCapable && (
              <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-sm text-zinc-400 flex items-center gap-2">
                  <span>ℹ️</span>
                  AI Enhancement unavailable: {enhancer.capabilities.recommendation.warnings.join(' ')}
                </p>
              </div>
            )}
            
            {/* Hardware check in progress */}
            {enhancer?.isCheckingHardware && (
              <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg animate-pulse">
                <p className="text-sm text-zinc-400 flex items-center gap-2">
                  <span className="animate-spin">⚙️</span>
                  Checking hardware for AI Enhancement...
                </p>
              </div>
            )}
            
            {/* Phase 3: Feedback Panel */}
            {enhancementId && !feedbackSubmitted && (
              <FeedbackPanel
                enhancementId={enhancementId}
                isVisible={showFeedback}
                onClose={handleFeedbackClose}
                onSubmit={handleFeedbackSubmit}
              />
            )}
            
            {/* Enhancement Error Display */}
            {enhancer?.error && (
              <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 flex items-center gap-2">
                  <span>❌</span>
                  Enhancement failed: {enhancer.error}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => enhancer.clearError()}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Dismiss
                  </button>
                  {(enhancer.error.includes('timed out') || 
                    enhancer.error.includes('corrupted') || 
                    enhancer.error.includes('hung')) && (
                    <button
                      onClick={async () => {
                        await enhancer.resetEngine();
                        enhancer.clearError();
                      }}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      🔧 Reset AI Engine & Clear Cache
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        {result.type !== "transcription" && result.blobUrl && (
          <button
            onClick={onDownload}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download {format?.name} File
          </button>
        )}

        <button
          onClick={() => setShowStats(true)}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
        >
          <BarChart3 className="w-5 h-5" />
          Statistics
        </button>

        <button
          onClick={onReset}
          className={`px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
            result.type === "transcription" ? "flex-1" : ""
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          Process Another
        </button>
      </div>

      {/* Statistics Modal */}
      <StatisticsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        result={result}
        file={file}
        modelKey={result.type === "transcription" ? selectedModelKey : undefined}
        startTime={processingStartTime || undefined}
        endTime={processingEndTime || undefined}
        peakMemoryMB={memoryUsageMB}
      />

      {/* Transcribe This Audio Section (for audio results only) */}
      {/* ONLY show if NO segment is selected */}
      {result.type === "audio" && onTranscribe && !waveformSelection && (
        <TranscribeFromDoneForm
          result={result}
          file={file}
          selectedModelKey={selectedModelKey}
          currentModel={currentModel}
          isModelLoaded={isModelLoaded}
          isModelLoading={isModelLoading}
          modelLoadingProgress={modelLoadingProgress}
          onModelSelect={onModelSelect}
          onTranscribe={onTranscribe}
        />
      )}

      {/* File Details (for audio/video results) */}
      {result.metadata && (result.type === "audio" || result.type === "video") && (
        <div className="mt-6 max-w-2xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">File Details</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {result.metadata.format && (
              <div>
                <dt className="text-zinc-500">Format</dt>
                <dd className="font-medium text-zinc-200 uppercase">{result.metadata.format}</dd>
              </div>
            )}
            {result.metadata.size && (
              <div>
                <dt className="text-zinc-500">Size</dt>
                <dd className="font-medium text-zinc-200">
                  {(result.metadata.size / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
            )}
            {result.metadata.compressionType && (
              <div>
                <dt className="text-zinc-500">Compression</dt>
                <dd className="font-medium">
                  {result.metadata.compressionType === "none" ? (
                    <span className="text-zinc-400">None</span>
                  ) : result.metadata.compressionType === "speech" ? (
                    <span className="text-green-400">🎙️ Speech</span>
                  ) : result.metadata.compressionType === "studio" ? (
                    <span className="text-blue-400">🎚️ Studio</span>
                  ) : (
                    <span className="text-purple-400">✨ Full</span>
                  )}
                </dd>
              </div>
            )}
            {result.metadata.normalized !== undefined && (
              <div>
                <dt className="text-zinc-500">Normalized</dt>
                <dd className="font-medium">
                  {result.metadata.normalized ? (
                    <span className="text-green-400">✓ Yes</span>
                  ) : (
                    <span className="text-zinc-400">✗ No</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* System Resources (collapsed) */}
      <details className="mt-6 max-w-2xl mx-auto">
        <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
          View Processing Stats
        </summary>
        <div className="mt-4">
          <ResourceMonitor
            metrics={metrics}
            memoryUsageMB={memoryUsageMB}
            progress={100}
          />
        </div>
      </details>
      
      {/* Enhancement Progress Overlay */}
      {showEnhancementProgress && enhancer.progress && (
        <EnhancementProgress
          progress={enhancer.progress}
          onCancel={handleCancelEnhancement}
        />
      )}

      {/* Speaker Edit Modal */}
      <SpeakerEditModal
        isOpen={showSpeakerEditModal}
        onClose={() => setShowSpeakerEditModal(false)}
        currentSpeakers={formattingOptions.speakerNames || new Map()}
        onSave={(updatedSpeakers) => {
          // Update formatting options with new speaker names
          setFormattingOptions(prev => ({
            ...prev,
            speakerNames: updatedSpeakers,
          }));
          console.log('[DoneStateView] Speaker names updated:', Array.from(updatedSpeakers.entries()));
        }}
      />
    </div>
  );
}



