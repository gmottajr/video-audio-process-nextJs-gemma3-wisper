"use client";

import { AlertTriangle, Cpu, Zap, Clock } from "lucide-react";
import type { ResourceRequirements } from "@/utils/resourceEstimation";
import {
  getResourceLevelColor,
  getResourceLevelIcon,
} from "@/utils/resourceEstimation";

interface ResourceWarningProps {
  requirements: ResourceRequirements;
  className?: string;
}

/**
 * Resource Warning Component
 * 
 * Displays warnings about RAM, GPU, CPU, and processing time requirements
 * for transcription tasks based on file size and model selection
 */
export function ResourceWarning({ requirements, className = "" }: ResourceWarningProps) {
  const { level, estimatedRAM, requiresGPU, requiresPowerfulCPU, estimatedProcessingTime, warnings } = requirements;
  
  // Don't show anything for low resource requirements
  if (level === "low" && warnings.length === 0) {
    return null;
  }

  const colorClass = getResourceLevelColor(level);
  const icon = getResourceLevelIcon(level);

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClass} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1">
          <h4 className="font-bold text-base mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {level === "extreme" && "EXTREME Resource Requirements"}
            {level === "high" && "High Resource Requirements"}
            {level === "medium" && "Moderate Resource Requirements"}
            {level === "low" && "Resource Information"}
          </h4>

          {/* Requirements Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
            <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5">
              <Zap className="w-4 h-4" />
              <div>
                <div className="text-xs opacity-70">RAM Required</div>
                <div className="font-bold">{estimatedRAM}GB+</div>
              </div>
            </div>

            {requiresGPU && (
              <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5">
                <Cpu className="w-4 h-4" />
                <div>
                  <div className="text-xs opacity-70">GPU</div>
                  <div className="font-bold">Recommended</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5">
              <Clock className="w-4 h-4" />
              <div>
                <div className="text-xs opacity-70">Est. Time</div>
                <div className="font-bold">{estimatedProcessingTime}</div>
              </div>
            </div>
          </div>

          {/* Warnings List */}
          {warnings.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-xs mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Extreme Warning Banner */}
          {level === "extreme" && (
            <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded p-3">
              <p className="text-sm font-bold">
                ⛔ WARNING: This configuration may crash your browser or freeze your system!
              </p>
              <p className="text-xs mt-1 opacity-90">
                Consider using a smaller file (&lt; 250MB) or a lighter model (tiny/base) for better results.
              </p>
            </div>
          )}

          {/* Powerful CPU Note */}
          {requiresPowerfulCPU && (
            <div className="mt-3 text-xs opacity-90 italic">
              💻 Requires a powerful multi-core processor (8+ cores recommended)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


