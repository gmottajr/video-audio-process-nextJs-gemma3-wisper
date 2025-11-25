"use client";

import { Brain, Play } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ProgressButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading?: boolean;
  progress?: number;
  variant?: "primary" | "transcribe";
  icon?: "brain" | "play";
  children: React.ReactNode;
  className?: string;
  size?: "default" | "large";
}

export function ProgressButton({
  onClick,
  disabled,
  isLoading = false,
  progress = 0,
  variant = "primary",
  icon = "play",
  children,
  className,
  size = "default",
}: ProgressButtonProps) {
  const IconComponent = icon === "brain" ? Brain : Play;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:shadow-none disabled:cursor-not-allowed relative overflow-hidden",
        size === "large" ? "px-6 py-4 text-lg" : "px-6 py-3 text-base",
        // Background color (shows when not filled or disabled)
        disabled || isLoading
          ? "bg-zinc-700 text-zinc-400"
          : variant === "transcribe"
          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
        className
      )}
    >
      {/* 🌈 Gradient Fill (animated from left to right) */}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out",
            variant === "transcribe"
              ? "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600"
              : "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600"
          )}
          style={{ width: `${progress}%` }}
        >
          {/* ✨ Shimmer Effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ transform: "translateX(-100%)" }}
          />
        </div>
      )}

      {/* Button Content (stays on top with z-index) */}
      <div className="relative z-10 flex items-center gap-3">
        <IconComponent
          className={cn("w-5 h-5", isLoading && "animate-pulse")}
        />
        <span>{children}</span>
      </div>

      {/* 📊 Bottom Progress Line (secondary indicator) */}
      {isLoading && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}
    </button>
  );
}

