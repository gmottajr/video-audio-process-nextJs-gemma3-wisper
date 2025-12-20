"use client";

/**
 * Enhancement Toggle Component
 * 
 * Shows AI enhancement option for capable hardware.
 * Displays hardware info and estimated processing times.
 */

import { useState } from "react";
import { Sparkles, Cpu, HardDrive, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { HardwareCapabilities } from "@/types/enhancement";
import { DEFAULT_MODEL } from "@/types/enhancement";

interface EnhancementToggleProps {
  capabilities: HardwareCapabilities;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  isModelLoaded?: boolean;
  isModelLoading?: boolean;
}

export function EnhancementToggle({
  capabilities,
  enabled,
  onToggle,
  disabled = false,
  isModelLoaded = false,
  isModelLoading = false,
}: EnhancementToggleProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Don't render if hardware is not capable
  if (!capabilities.isCapable) {
    return null;
  }

  const getTierIcon = () => {
    switch (capabilities.gpuTier) {
      case 'high':
        return '🚀';
      case 'medium':
        return '⚡';
      case 'low':
        return '🔋';
      default:
        return '❌';
    }
  };

  const getTierLabel = () => {
    switch (capabilities.gpuTier) {
      case 'high':
        return 'High Performance';
      case 'medium':
        return 'Good Performance';
      case 'low':
        return 'Basic Performance';
      default:
        return 'Unsupported';
    }
  };

  const getTierColor = () => {
    switch (capabilities.gpuTier) {
      case 'high':
        return 'text-green-400';
      case 'medium':
        return 'text-blue-400';
      case 'low':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              AI Enhancement
              {isModelLoaded && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  Ready
                </span>
              )}
              {isModelLoading && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full animate-pulse">
                  Loading...
                </span>
              )}
            </h3>
            <p className="text-sm text-zinc-400">
              Remove filler words & improve grammar with AI
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(!enabled)}
          disabled={disabled || isModelLoading}
          className={`
            relative inline-flex h-7 w-12 items-center rounded-full
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900
            ${enabled ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-zinc-700'}
            ${(disabled || isModelLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
          `}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full bg-white shadow-lg
              transition-transform duration-200 ease-in-out
              ${enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Expandable Details */}
      {enabled && (
        <div className="border-t border-purple-500/20">
          {/* Quick Info Bar */}
          <div className="px-4 py-3 flex items-center justify-between bg-purple-950/30">
            <div className="flex items-center gap-4 text-sm">
              <span className={`flex items-center gap-1.5 ${getTierColor()}`}>
                <span>{getTierIcon()}</span>
                <span>{getTierLabel()}</span>
              </span>
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                ~{capabilities.recommendation.estimatedProcessTime}
              </span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              {showDetails ? (
                <>
                  Hide Details <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show Details <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Detailed Info */}
          {showDetails && (
            <div className="px-4 py-4 space-y-4 bg-zinc-900/30">
              {/* Hardware Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg">
                  <Cpu className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">GPU</p>
                    <p className="text-sm text-zinc-200 truncate" title={capabilities.gpuInfo?.description}>
                      {capabilities.gpuInfo?.description || 'Unknown GPU'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg">
                  <HardDrive className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">VRAM</p>
                    <p className="text-sm text-zinc-200">
                      ~{capabilities.estimatedVRAM.toFixed(1)} GB
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Info */}
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">AI Model</p>
                <p className="text-sm text-zinc-200">{DEFAULT_MODEL.name}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {DEFAULT_MODEL.size} • First use downloads model (cached after)
                </p>
              </div>

              {/* Time Estimates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">First Load</p>
                  <p className="text-sm text-zinc-200">{capabilities.recommendation.estimatedLoadTime}</p>
                  <p className="text-xs text-zinc-400 mt-1">One-time download</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Processing</p>
                  <p className="text-sm text-zinc-200">{capabilities.recommendation.estimatedProcessTime}</p>
                  <p className="text-xs text-zinc-400 mt-1">Per transcript</p>
                </div>
              </div>

              {/* Warnings */}
              {capabilities.recommendation.warnings.length > 0 && (
                <div className="space-y-2">
                  {capabilities.recommendation.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-yellow-950/30 border border-yellow-500/20 rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* What it does */}
              <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-400 uppercase tracking-wide mb-2">What AI Enhancement Does</p>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Removes filler words (um, uh, like, you know...)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Fixes grammar and punctuation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Cleans up run-on sentences
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Preserves original meaning exactly
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




