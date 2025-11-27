"use client";

import { useState, useEffect } from "react";
import { WaveformViewer } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { StatisticsModal } from "@/components/StatisticsModal";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { Download, RotateCcw, Brain, BarChart3 } from "lucide-react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { CompressionType } from "@/components/ActionSelector";
import { PageHeader } from "@/components/PageHeader";
import { getResourceWarning, formatFileSize } from "@/utils/resourceEstimation";

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
  onTranscribe?: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey) => void;
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
  const format =
    result.type === "audio"
      ? getFormatById(formatId || "")
      : result.type === "video"
      ? getVideoFormatById(formatId || "")
      : null;

  // State for transcription enhancements (only when transcribing from done state)
  const [compressionType, setCompressionType] = useState<CompressionType>("none");
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [localModelKey, setLocalModelKey] = useState<ModelKey>(selectedModelKey);

  // Update local model key when prop changes
  useEffect(() => {
    setLocalModelKey(selectedModelKey);
  }, [selectedModelKey]);

  // Handle model selection
  const handleModelChange = (modelKey: ModelKey) => {
    setLocalModelKey(modelKey);
    if (onModelSelect) {
      onModelSelect(modelKey);
    }
  };
  
  // Check if enhancements were already applied
  const wasCompressed = result.metadata?.compressionType && result.metadata.compressionType !== "none";
  const wasNormalized = result.metadata?.normalized;
  
  // Smart recommendations based on filename
  const filename = file.name.toLowerCase();
  const isMeetingContent = /meeting|interview|call|conversation|conference/i.test(filename);
  const isPodcastContent = /podcast|broadcast|episode|show/i.test(filename);
  const hasNewEnhancements = compressionType !== "none" || normalizeAudio;
  
  const getSmartRecommendation = (): string | null => {
    if (isMeetingContent && compressionType !== "speech" && !wasCompressed) {
      return "💡 Tip: Speech compression recommended for multi-speaker content";
    }
    if (isPodcastContent && compressionType !== "studio" && !wasCompressed) {
      return "💡 Tip: Studio compression recommended for professional broadcasting";
    }
    if (hasNewEnhancements) {
      return "✨ Audio will be enhanced before transcription for better accuracy";
    }
    return null;
  };

  // Calculate resource requirements for transcription (use local model key for accurate warnings)
  const resourceWarning = getResourceWarning(file, localModelKey);
  const showResourceWarning = (
    resourceWarning.estimatedRAM >= 50 || 
    resourceWarning.level === "extreme" || 
    resourceWarning.level === "dangerous"
  );

  const handleTranscribe = () => {
    if (onTranscribe && (isModelLoaded || isModelLoading)) {
      onTranscribe(compressionType, normalizeAudio, localModelKey);
    }
  };

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
          <WaveformViewer audioUrl={result.blobUrl} />
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
          <TranscriptionViewer
            result={result.transcription}
            filename={file.name.split(".")[0]}
            modelName={
              currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined
            }
          />
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
      {result.type === "audio" && onTranscribe && (
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-purple-950/30 via-indigo-950/30 to-blue-950/30 border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-zinc-100">
                Transcribe This Audio
              </h3>
              <span className="text-xs text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full font-medium">
                AI Whisper
              </span>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              Convert this audio to text using AI transcription. Choose your model and optionally enhance the audio first for better accuracy.
            </p>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="text-xs font-medium text-zinc-300 mb-2 block">
                Select AI Model:
              </label>
              <ModelSelector
                selectedModel={localModelKey}
                currentlyLoadedModel={currentModel}
                isLoading={isModelLoading}
                onModelSelect={handleModelChange}
                file={file}
              />
            </div>

            {/* Enhancement Options */}
            <div className="space-y-3 mb-4">
              {/* Compression Selector (only if not already compressed) */}
              {!wasCompressed && (
                <div>
                  <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                    Add Compression (Optional):
                  </label>
                  <select
                    value={compressionType}
                    onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="none">⭕ No Compression (use as-is)</option>
                    <option value="speech">🎙️ Speech - Meetings, Interviews (+15%)</option>
                    <option value="studio">🎚️ Studio - Podcasts, Broadcasts (+12%)</option>
                    <option value="both">🎛️ Both - Maximum Enhancement (+25%)</option>
                  </select>
                </div>
              )}

              {/* Normalization Checkbox (only if not already normalized) */}
              {!wasNormalized && (
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={normalizeAudio}
                    onChange={(e) => setNormalizeAudio(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
                  />
                  <span className="ml-2 text-sm text-zinc-100 group-hover:text-purple-300 transition-colors">
                    🎵 Normalize Audio (EBU R128) - Improves transcription
                  </span>
                </label>
              )}

              {/* Show what's already applied */}
              {(wasCompressed || wasNormalized) && (
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-md p-3">
                  <p className="text-xs font-medium text-zinc-300 mb-1">Already Applied:</p>
                  <div className="flex flex-wrap gap-2">
                    {wasCompressed && (
                      <span className="text-xs px-2 py-1 bg-green-950/50 border border-green-500/30 text-green-300 rounded-full">
                        {result.metadata?.compressionType === "speech" ? "🎙️ Speech Compressed" :
                         result.metadata?.compressionType === "studio" ? "🎚️ Studio Compressed" :
                         "🎛️ Both Compressions"}
                      </span>
                    )}
                    {wasNormalized && (
                      <span className="text-xs px-2 py-1 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-full">
                        🎵 Normalized
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Smart Recommendation */}
            {getSmartRecommendation() && (
              <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
                <p className="text-xs text-blue-300 leading-relaxed">
                  {getSmartRecommendation()}
                </p>
              </div>
            )}

            {/* Resource Warning for Transcription */}
            {showResourceWarning && onTranscribe && (
                <div className={`mb-4 p-3 rounded-lg border-2 ${
                  resourceWarning.level === "dangerous" ? "bg-red-950/50 border-red-500/50" :
                  resourceWarning.level === "extreme" ? "bg-orange-950/50 border-orange-500/50" :
                  "bg-yellow-950/50 border-yellow-500/50"
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{resourceWarning.icon}</span>
                    <div className="flex-1">
                      <h4 className={`font-bold text-xs mb-1 ${
                        resourceWarning.level === "dangerous" ? "text-red-300" :
                        resourceWarning.level === "extreme" ? "text-orange-300" :
                        "text-yellow-300"
                      }`}>
                        {resourceWarning.message}
                      </h4>
                      <p className="text-xs text-zinc-300 mb-2">
                        {resourceWarning.recommendation}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div className="bg-zinc-800/50 rounded px-2 py-1">
                          <span className="text-zinc-400">RAM: </span>
                          <span className="text-zinc-200 font-semibold">{resourceWarning.estimatedRAM}GB+</span>
                        </div>
                        <div className="bg-zinc-800/50 rounded px-2 py-1">
                          <span className="text-zinc-400">File: </span>
                          <span className="text-zinc-200 font-semibold">{formatFileSize(file.size)}</span>
                        </div>
                        {resourceWarning.requiresGPU && (
                          <div className="bg-zinc-800/50 rounded px-2 py-1 col-span-2">
                            <span className="text-zinc-400">💻 GPU Recommended</span>
                          </div>
                        )}
                        {resourceWarning.requiresHighEndCPU && (
                          <div className="bg-zinc-800/50 rounded px-2 py-1 col-span-2">
                            <span className="text-zinc-400">⚡ High-End CPU Required (32GB+ RAM)</span>
                          </div>
                        )}
                        <div className="bg-zinc-800/50 rounded px-2 py-1 col-span-2">
                          <span className="text-zinc-400">⏱️ Est. Time: </span>
                          <span className="text-zinc-200 font-semibold">~{resourceWarning.estimatedTimeMinutes} minutes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {/* Transcribe Button */}
            <button
              onClick={handleTranscribe}
              disabled={!isModelLoaded && !isModelLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-zinc-700 disabled:to-zinc-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
            >
              <Brain className="w-5 h-5" />
              {isModelLoading
                ? `Loading AI Model... ${Math.round(modelLoadingProgress)}%`
                : isModelLoaded
                ? hasNewEnhancements
                  ? "🎵 Enhance & Transcribe to Text"
                  : "Transcribe to Text"
                : "Waiting for AI Model..."}
            </button>

            <p className="mt-3 text-xs text-center text-zinc-500">
              {isModelLoading
                ? "🤖 AI model is loading..."
                : isModelLoaded
                ? hasNewEnhancements
                  ? "Audio will be enhanced, then transcribed using Whisper AI"
                  : "Audio will be transcribed directly using Whisper AI"
                : "⏳ Waiting for AI model to be ready..."}
            </p>
          </div>
        </div>
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
    </div>
  );
}



