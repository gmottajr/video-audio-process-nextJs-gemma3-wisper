"use client";

import { Cpu, Database, Gauge } from "lucide-react";
import { cn } from "@/utils/cn";

interface FFmpegMetrics {
  speed: number | null;
  duration: number | null;
  bitrate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  resolution: string | null;
  fps: number | null;
}

interface ResourceMonitorProps {
  metrics: FFmpegMetrics;
  memoryUsageMB: number;
  progress: number;
  className?: string;
}

export function ResourceMonitor({
  metrics,
  memoryUsageMB,
  progress,
  className,
}: ResourceMonitorProps) {
  // CPU Efficiency color logic based on speed metric
  const getSpeedColor = (speed: number | null): string => {
    if (speed === null) return "text-zinc-500";
    if (speed < 0.8) return "text-red-400"; // Struggling
    if (speed < 1.1) return "text-yellow-400"; // Normal
    return "text-green-400"; // Efficient
  };

  const getSpeedBgColor = (speed: number | null): string => {
    if (speed === null) return "bg-zinc-800";
    if (speed < 0.8) return "bg-red-950/30 border-red-800";
    if (speed < 1.1) return "bg-yellow-950/30 border-yellow-800";
    return "bg-green-950/30 border-green-800";
  };

  const getSpeedLabel = (speed: number | null): string => {
    if (speed === null) return "Idle";
    if (speed < 0.8) return "High CPU Load";
    if (speed < 1.1) return "Normal";
    return "Efficient";
  };

  // Memory usage visualization (assume 2GB WASM max)
  const maxMemoryMB = 2048;
  const memoryPercentage = Math.min((memoryUsageMB / maxMemoryMB) * 100, 100);
  const isMemoryHigh = memoryUsageMB > 1500; // >1.5GB is high

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Efficiency Card */}
        <div
          className={cn(
            "p-4 rounded-lg border transition-colors",
            getSpeedBgColor(metrics.speed)
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-800/50 rounded">
              <Cpu className={cn("w-5 h-5", getSpeedColor(metrics.speed))} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400 mb-0.5">CPU Efficiency</p>
              <p className={cn("text-2xl font-bold", getSpeedColor(metrics.speed))}>
                {metrics.speed !== null ? `${metrics.speed.toFixed(2)}x` : "—"}
              </p>
            </div>
          </div>
          <p className={cn("text-xs font-medium", getSpeedColor(metrics.speed))}>
            {getSpeedLabel(metrics.speed)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {metrics.speed !== null && metrics.speed < 1.0
              ? "Processing slower than real-time"
              : metrics.speed !== null && metrics.speed >= 1.0
              ? "Processing faster than real-time"
              : "No active processing"}
          </p>
        </div>

        {/* Memory Usage Card */}
        <div
          className={cn(
            "p-4 rounded-lg border transition-colors",
            isMemoryHigh
              ? "bg-red-950/30 border-red-800"
              : "bg-zinc-800 border-zinc-700"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-800/50 rounded">
              <Database
                className={cn("w-5 h-5", isMemoryHigh ? "text-red-400" : "text-blue-400")}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400 mb-0.5">Memory Usage</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  isMemoryHigh ? "text-red-400" : "text-blue-400"
                )}
              >
                {memoryUsageMB > 0 ? `${memoryUsageMB}` : "—"}
                <span className="text-sm font-normal text-zinc-500 ml-1">MB</span>
              </p>
            </div>
          </div>

          {/* Memory Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  isMemoryHigh ? "bg-red-500" : "bg-blue-500"
                )}
                style={{ width: `${memoryPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0 MB</span>
              <span>{maxMemoryMB} MB (WASM Max)</span>
            </div>
          </div>
        </div>

        {/* Processing Status Card */}
        <div className="p-4 rounded-lg border bg-zinc-800 border-zinc-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-800/50 rounded">
              <Gauge
                className={cn(
                  "w-5 h-5",
                  progress > 0 && progress < 100 ? "text-cyan-400" : "text-zinc-400"
                )}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400 mb-0.5">Processing</p>
              <p className="text-2xl font-bold text-cyan-400">
                {progress}
                <span className="text-sm font-normal text-zinc-500 ml-1">%</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {progress === 0
              ? "Idle - waiting for input"
              : progress === 100
              ? "Complete"
              : "Processing in progress..."}
          </p>
        </div>
      </div>

      {/* Full-Width Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Overall Progress</span>
            <span className="text-cyan-400 font-medium">{progress}%</span>
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

