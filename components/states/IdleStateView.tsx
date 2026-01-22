"use client";

import { FileUploader } from "@/components/FileUploader";
import { PageHeader } from "@/components/PageHeader";
import { Video, Music, Brain, Shield, Lock, Server } from "lucide-react";

interface IdleStateViewProps {
  onFileSelect: (file: File | null) => void;
  isLoading: boolean;
  maxFileSize: number;
  recommendedFileSize: number;
}

/**
 * IDLE State View
 * Shows when user first arrives or after reset
 * Includes features overview and privacy notice
 */
export function IdleStateView({
  onFileSelect,
  isLoading,
  maxFileSize,
  recommendedFileSize,
}: IdleStateViewProps) {
  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 px-2 sm:px-0">
      {/* Main Title - Logo Only */}
      <PageHeader showLogo={true} />

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Video Conversion */}
        <div className="bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/40 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-600/30 rounded-lg">
              <Video className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-bold text-zinc-100">Video Processing</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-2">
            Convert & extract audio from video files. MP4, MKV, WebM, AVI supported.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Lock className="w-3 h-3" />
            <span>No server upload</span>
          </div>
        </div>

        {/* Audio Conversion */}
        <div className="bg-gradient-to-br from-blue-950/40 to-cyan-950/40 border border-blue-500/20 rounded-xl p-5 hover:border-blue-500/40 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600/30 rounded-lg">
              <Music className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-zinc-100">Audio Conversion</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-2">
            Convert formats, compress, and normalize audio. WAV, MP3, AAC, OGG.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Lock className="w-3 h-3" />
            <span>No server upload</span>
          </div>
        </div>

        {/* AI Transcription */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-600/30 rounded-lg">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-zinc-100">AI Transcription</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-2">
            Speech-to-text with OpenAI Whisper. Word timestamps & SRT export.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <Lock className="w-3 h-3" />
            <span>No server upload</span>
          </div>
        </div>
      </div>

      {/* Pro Tip: Segment Transcription */}
      <div className="mb-8 bg-gradient-to-r from-amber-950/30 via-orange-950/30 to-amber-950/30 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">✂️</span>
          <div>
            <h4 className="font-bold text-amber-200 text-sm mb-1">Pro Tip: Transcribe Specific Segments</h4>
            <p className="text-xs text-amber-300/80">
              Want to transcribe only part of a video? Select <span className="font-semibold text-amber-200">"Extract Audio"</span> first, 
              then use the waveform viewer to select and transcribe specific sections. Perfect for long recordings!
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Banner */}
      <div className="mb-8 bg-gradient-to-r from-green-950/30 via-emerald-950/30 to-green-950/30 border border-green-500/30 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-full">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h4 className="font-bold text-green-300 text-sm">100% Private & Offline</h4>
              <p className="text-xs text-green-400/80">All processing happens in your browser</p>
            </div>
          </div>
          <div className="h-8 w-px bg-green-500/30 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-full">
              <Server className="w-6 h-6 text-green-400 opacity-50" />
            </div>
            <div>
              <h4 className="font-bold text-green-300 text-sm">Zero Data Collection</h4>
              <p className="text-xs text-green-400/80">Your files never leave your device</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-bold mb-2 text-zinc-100">Select Your Media File</h3>
          <p className="text-zinc-400 text-sm">
            {isLoading
              ? "Initializing processing engine..."
              : "Drag and drop or click to browse your files"}
          </p>
        </div>
        <FileUploader
          onFileSelect={onFileSelect}
          maxFileSize={maxFileSize}
          recommendedFileSize={recommendedFileSize}
        />
      </div>

      {/* Legal Notice for Transcription */}
      <div className="mt-8 max-w-2xl mx-auto">
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4">
          <p className="text-xs text-zinc-500 text-center leading-relaxed">
            <span className="text-zinc-400 font-medium">⚖️ Legal Notice:</span> AI transcription is provided for personal use. 
            You are responsible for obtaining proper consent when transcribing recordings of others. 
            Accuracy may vary; always review transcripts before relying on them for official purposes.
            The AI models run entirely in your browser—no audio data is transmitted to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}



