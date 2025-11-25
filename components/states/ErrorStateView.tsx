"use client";

import { AlertCircle } from "lucide-react";

interface ErrorStateViewProps {
  error: string;
  onRetry: () => void;
  onReset: () => void;
  canRetry: boolean;
}

/**
 * ERROR State View
 * Shows error message with recovery options
 */
export function ErrorStateView({
  error,
  onRetry,
  onReset,
  canRetry,
}: ErrorStateViewProps) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="bg-red-950/30 border-2 border-red-500/50 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Something Went Wrong
        </h2>
        <p className="text-zinc-300 mb-6">{error}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-200"
            >
              Try Again
            </button>
          )}
          <button
            onClick={onReset}
            className="px-8 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition-all duration-200"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

