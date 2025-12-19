"use client";

import { useState, useEffect } from "react";
import { WaveformViewer, WaveformSelection } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { EnhancedTranscriptionViewer } from "@/components/EnhancedTranscriptionViewer";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { StatisticsModal } from "@/components/StatisticsModal";
import { TranscribeFromDoneForm } from "@/components/TranscribeFromDoneForm";
import { ResourceComparison } from "@/components/ResourceComparison";
import { EnhancementToggle } from "@/components/EnhancementToggle";
import { EnhancementProgress } from "@/components/EnhancementProgress";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { Download, RotateCcw, BarChart3, Scissors, Sparkles } from "lucide-react";
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
  const [enhancementEnabled, setEnhancementEnabled] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<EnhancementResult | null>(null);
  
  // Get enhancer context (optional - may not be available)
  const enhancer = useEnhancerContextOptional();
  
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
  
  // Handle enhancement toggle
  const handleEnhancementToggle = async (enabled: boolean) => {
    setEnhancementEnabled(enabled);
    
    // If turning on and we have a transcription, start enhancement
    if (enabled && result.type === "transcription" && result.transcription?.text && enhancer) {
      try {
        // Load model if not already loaded
        if (!enhancer.isModelLoaded && !enhancer.isModelLoading) {
          await enhancer.loadModel();
        }
        
        // Run enhancement with Whisper result for context-aware prompting (Phase 2)
        // Pass the full transcription result and audio duration for metadata extraction
        const enhancementResult = await enhancer.enhance(
          result.transcription.text,
          result.transcription,  // Pass full Whisper result for metadata extraction
          metrics?.duration       // Pass audio duration
        );
        setEnhancedResult(enhancementResult);
        
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
            <EnhancedTranscriptionViewer
              rawResult={result.transcription}
              enhancedResult={enhancedResult}
              filename={file.name.split(".")[0]}
              modelName={
                currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined
              }
            />
            
            {/* AI Enhancement Toggle */}
            {enhancer && enhancer.capabilities && !enhancer.isCheckingHardware && (
              <EnhancementToggle
                capabilities={enhancer.capabilities}
                enabled={enhancementEnabled}
                onToggle={handleEnhancementToggle}
                disabled={enhancer.isEnhancing || enhancer.isModelLoading}
                isModelLoaded={enhancer.isModelLoaded}
                isModelLoading={enhancer.isModelLoading}
              />
            )}
            
            {/* Enhancement Error Display */}
            {enhancer?.error && (
              <div className="mt-4 p-4 bg-red-950/30 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 flex items-center gap-2">
                  <span>❌</span>
                  Enhancement failed: {enhancer.error}
                </p>
                <button
                  onClick={() => enhancer.clearError()}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Dismiss
                </button>
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
    </div>
  );
}



