/**
 * TranscriptionFormHeader Component
 * 
 * Responsible for displaying the form title, icon, and badges.
 */

import { Brain } from "lucide-react";

interface TranscriptionFormHeaderProps {
  title?: string;
  subtitle?: string;
  badge?: string;
}

export function TranscriptionFormHeader({
  title = "Transcribe This Audio",
  subtitle = "Convert this audio to text using AI transcription. Choose your model and optionally enhance the audio first for better accuracy.",
  badge = "AI Whisper",
}: TranscriptionFormHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
        <span className="text-xs text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full font-medium">
          {badge}
        </span>
      </div>

      {subtitle && (
        <p className="text-sm text-zinc-400 mb-4">{subtitle}</p>
      )}
    </>
  );
}

