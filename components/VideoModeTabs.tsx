"use client";

import { Scissors, RefreshCw, Brain } from "lucide-react";
import { cn } from "@/utils/cn";

export type VideoMode = "extract" | "convert" | "transcribe";

interface VideoModeTabsProps {
  selectedMode: VideoMode;
  onModeChange: (mode: VideoMode) => void;
}

export function VideoModeTabs({ selectedMode, onModeChange }: VideoModeTabsProps) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-zinc-800/50 rounded-lg">
        <button
          onClick={() => onModeChange("extract")}
          className={cn(
            "px-3 py-2.5 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm",
            selectedMode === "extract"
              ? "bg-green-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50"
          )}
        >
          <Scissors className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Extract Audio</span>
        </button>
        <button
          onClick={() => onModeChange("convert")}
          className={cn(
            "px-3 py-2.5 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm",
            selectedMode === "convert"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50"
          )}
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Convert Container</span>
        </button>
        <button
          onClick={() => onModeChange("transcribe")}
          className={cn(
            "px-3 py-2.5 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm",
            selectedMode === "transcribe"
              ? "bg-purple-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50"
          )}
        >
          <Brain className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">AI Transcription</span>
        </button>
      </div>
    </div>
  );
}

