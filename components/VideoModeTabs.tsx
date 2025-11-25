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
      <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-lg">
        <button
          onClick={() => onModeChange("extract")}
          className={cn(
            "flex-1 px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2",
            selectedMode === "extract"
              ? "bg-green-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300"
          )}
        >
          <Scissors className="w-4 h-4" />
          Extract Audio
        </button>
        <button
          onClick={() => onModeChange("convert")}
          className={cn(
            "flex-1 px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2",
            selectedMode === "convert"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Convert Container
        </button>
        <button
          onClick={() => onModeChange("transcribe")}
          className={cn(
            "flex-1 px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center justify-center gap-2",
            selectedMode === "transcribe"
              ? "bg-purple-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-300"
          )}
        >
          <Brain className="w-4 h-4" />
          AI Transcribe
        </button>
      </div>
    </div>
  );
}

