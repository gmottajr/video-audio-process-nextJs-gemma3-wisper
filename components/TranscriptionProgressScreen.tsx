"use client";

import { useTranscriberContext } from "@/contexts/TranscriberContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { X } from "lucide-react";

/**
 * Transcription Progress Screen
 * 
 * Shows an overlay while transcription is in progress.
 * Different from ModelLoadingScreen - this is for the actual transcription process.
 */
export default function TranscriptionProgressScreen() {
  const { progress, loadingMessage, clearResult, isTranscribing } = useTranscriberContext();

  // Don't render if not transcribing
  if (!isTranscribing) return null;

  // Extract elapsed time from loading message
  // Format: "⏳ Processing... 5min 30s elapsed (estimated 40%)"
  const elapsedMatch = loadingMessage.match(/(\d+min \d+s)/);
  const elapsedTime = elapsedMatch ? elapsedMatch[1] : '';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Breadcrumbs at top */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <Breadcrumbs 
          currentState="PROCESSING" 
          onNavigate={() => {}}
        />
      </div>

      {/* Main content centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="inline-block p-6 bg-white/10 rounded-full backdrop-blur-sm mb-4">
            <svg className="w-16 h-16 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Processing Transcription
          </h1>
          <p className="text-blue-200">
            Analyzing audio with AI... This may take a while for long files.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-100">
                {loadingMessage || 'Processing...'}
              </span>
              <span className="text-sm font-bold text-white">
                {progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer effect */}
                <div className="w-full h-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
            </div>
          </div>

          {/* Elapsed Time Display */}
          {elapsedTime && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg">
                <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-100">
                  Time elapsed: <span className="font-bold text-white">{elapsedTime}</span>
                </span>
              </div>
            </div>
          )}

          {/* Status Messages */}
          <div className="space-y-2 text-sm text-blue-100 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Audio prepared for AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${progress > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
              <span>Analyzing with Whisper AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${progress > 90 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
              <span>Finalizing transcription</span>
            </div>
          </div>

          {/* Cancel Button */}
          <button
            onClick={() => {
              console.log('[TranscriptionProgressScreen] Cancelling transcription...');
              clearResult();
              // Note: This will reset states but won't actually stop the worker
              // The worker will complete but the result will be discarded
            }}
            className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
          >
            <X className="w-4 h-4" />
            Cancel Transcription
          </button>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-xs text-blue-200 text-center">
              ⚠️ Browser-based AI is CPU-intensive<br />
              Long files may take several minutes to process
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-blue-300">
            Processing locally in your browser • No data sent to servers
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

