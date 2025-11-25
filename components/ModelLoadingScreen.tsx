"use client";

import { useEffect } from "react";
import { useTranscriberContext } from "@/contexts/TranscriberContext";

/**
 * Model Loading Screen
 * 
 * Shows a beautiful loading screen while the AI model loads.
 * Once loaded, automatically shows the main app.
 */
export default function ModelLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const { isModelLoading, isModelLoaded, progress, loadingMessage, error } = useTranscriberContext();

  // Model is auto-loading in TranscriberContext, we just display progress here

  // When model is loaded, notify parent (if callback provided)
  useEffect(() => {
    if (isModelLoaded && !isModelLoading && onComplete) {
      console.log('[ModelLoadingScreen] ✅ Model loaded! Showing main app...');
      setTimeout(() => {
        onComplete();
      }, 500); // Small delay for smooth transition
    }
  }, [isModelLoaded, isModelLoading, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Logo/Icon */}
        <div className="text-center mb-8">
          <div className="inline-block p-6 bg-white/10 rounded-full backdrop-blur-sm mb-4">
            <svg className="w-16 h-16 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            AI Transcription
          </h1>
          <p className="text-blue-200">
            Initializing Whisper AI Model
          </p>
        </div>

        {/* Loading Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          {error ? (
            // Error State
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-red-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Loading Failed</h2>
              <p className="text-red-200 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            // Loading State
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-100">
                    {loadingMessage || 'Initializing...'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {progress}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Shimmer effect */}
                    <div className="w-full h-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              <div className="space-y-2 text-sm text-blue-100">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${progress > 0 ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span>Initializing AI worker</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${progress > 10 ? 'bg-green-400' : progress > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span>Loading model files</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${progress > 90 ? 'bg-green-400' : progress > 10 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span>Initializing inference engine</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${progress === 100 ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span>Ready for transcription</span>
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-xs text-blue-200 text-center">
                  This may take 30-60 seconds on first load.<br />
                  Model files are cached for instant loading next time.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-blue-300">
            Powered by Whisper AI • Running locally in your browser
          </p>
        </div>
      </div>
    </div>
  );
}

