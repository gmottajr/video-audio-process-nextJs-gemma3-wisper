"use client";

import { Brain } from "lucide-react";

interface TranscribeInfoCardProps {
  compact?: boolean;
}

export function TranscribeInfoCard({ compact = false }: TranscribeInfoCardProps) {
  if (compact) {
    return (
      <div className="mb-3 p-4 bg-gradient-to-br from-purple-950/30 to-pink-950/30 border border-purple-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-600 rounded-lg flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-zinc-100 mb-1 text-sm">AI Transcription</h4>
            <p className="text-xs text-zinc-400">
              Convert speech to text using Whisper AI. Runs 100% in your browser—completely private.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-purple-950/30 to-pink-950/30 border border-purple-500/30 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-600 rounded-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-zinc-100 mb-2">OpenAI Whisper Model</h4>
          <p className="text-sm text-zinc-400 mb-3">
            Automatically transcribe your video's audio to text using state-of-the-art AI.
            The model runs entirely in your browser—no data is sent to any server.
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Completely private & offline</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Word-level timestamps included</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Export as TXT, JSON, or SRT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

