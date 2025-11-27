/**
 * TranscribeButton Component
 * 
 * Responsible for rendering the transcribe button with appropriate
 * loading states and messages.
 */

import { Brain } from "lucide-react";

interface TranscribeButtonProps {
  onClick: () => void;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadingProgress: number;
  hasNewEnhancements: boolean;
  disabled?: boolean;
}

export function TranscribeButton({
  onClick,
  isModelLoaded,
  isModelLoading,
  modelLoadingProgress,
  hasNewEnhancements,
  disabled = false,
}: TranscribeButtonProps) {
  const isDisabled = disabled || (!isModelLoaded && !isModelLoading);

  const getButtonText = () => {
    if (isModelLoading) {
      return `Loading AI Model... ${Math.round(modelLoadingProgress)}%`;
    }
    if (isModelLoaded) {
      return hasNewEnhancements ? "🎵 Enhance & Transcribe to Text" : "Transcribe to Text";
    }
    return "Waiting for AI Model...";
  };

  const getHelpText = () => {
    if (isModelLoading) {
      return "🤖 AI model is loading...";
    }
    if (isModelLoaded) {
      return hasNewEnhancements
        ? "Audio will be enhanced, then transcribed using Whisper AI"
        : "Audio will be transcribed directly using Whisper AI";
    }
    return "⏳ Waiting for AI model to be ready...";
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={isDisabled}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-zinc-700 disabled:to-zinc-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
      >
        <Brain className="w-5 h-5" />
        {getButtonText()}
      </button>

      <p className="mt-3 text-xs text-center text-zinc-500">{getHelpText()}</p>
    </>
  );
}

