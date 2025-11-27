"use client";

import React from "react";
import type { ModelKey } from "@/components/ModelSelector";
import { getResourceWarning, formatFileSize } from "@/utils/resourceEstimation";
import { cn } from "@/utils/cn";

interface ResourceWarningCardProps {
  file: File;
  modelKey: ModelKey;
  className?: string;
  minRAMThreshold?: number; // Only show if RAM >= this (default: 50GB)
}

/**
 * Reusable Resource Warning Card
 * 
 * Displays RAM, processing time, and hardware requirements
 * for transcription operations.
 * 
 * Used in:
 * - ActionSelector (transcribe mode)
 * - DoneStateView (transcribe from done)
 * 
 * @example
 * <ResourceWarningCard 
 *   file={file} 
 *   modelKey={selectedModelKey}
 *   minRAMThreshold={50}
 * />
 */
export function ResourceWarningCard({
  file,
  modelKey,
  className,
  minRAMThreshold = 50,
}: ResourceWarningCardProps) {
  const resourceWarning = getResourceWarning(file, modelKey);

  // Only show warning if RAM usage is significant
  if (resourceWarning.estimatedRAM < minRAMThreshold) {
    return null;
  }

  // Determine styling based on warning level
  const levelStyles = {
    light: "bg-blue-950/50 border-blue-500/50",
    moderate: "bg-yellow-950/50 border-yellow-500/50",
    heavy: "bg-yellow-950/50 border-yellow-500/50",
    extreme: "bg-orange-950/50 border-orange-500/50",
    dangerous: "bg-red-950/50 border-red-500/50",
  };

  const textColorStyles = {
    light: "text-blue-300",
    moderate: "text-yellow-300",
    heavy: "text-yellow-300",
    extreme: "text-orange-300",
    dangerous: "text-red-300",
  };

  const iconColorStyles = {
    light: "text-blue-400",
    moderate: "text-yellow-400",
    heavy: "text-yellow-400",
    extreme: "text-orange-400",
    dangerous: "text-red-400",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2",
        levelStyles[resourceWarning.level],
        className
      )}
      data-testid="resource-warning-card"
      data-level={resourceWarning.level}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn("text-xl shrink-0", iconColorStyles[resourceWarning.level])}
          aria-hidden="true"
        >
          {resourceWarning.icon}
        </span>
        <div className="flex-1">
          <h4
            className={cn(
              "font-bold text-xs mb-1",
              textColorStyles[resourceWarning.level]
            )}
            role="heading"
            aria-level={4}
          >
            {resourceWarning.message}
          </h4>
          <p className="text-xs text-zinc-300 mb-2">
            {resourceWarning.recommendation}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoCell
              label="Est. RAM"
              value={`${resourceWarning.estimatedRAM}GB+`}
              testId="ram-estimate"
            />
            <InfoCell
              label="Est. Time"
              value={`${resourceWarning.estimatedTimeMinutes} min`}
              testId="time-estimate"
            />
            {resourceWarning.requiresHighEndCPU && (
              <InfoCell
                label="CPU"
                value="High-end required"
                testId="cpu-requirement"
              />
            )}
            {resourceWarning.requiresGPU && (
              <InfoCell
                label="GPU"
                value="Dedicated recommended"
                testId="gpu-requirement"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Info Cell Component
 * Small metric display cell
 */
function InfoCell({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div
      className="bg-zinc-800/50 rounded px-2 py-1"
      data-testid={testId}
    >
      <span className="text-zinc-400">{label}: </span>
      <span className="text-zinc-200 font-semibold">{value}</span>
    </div>
  );
}

