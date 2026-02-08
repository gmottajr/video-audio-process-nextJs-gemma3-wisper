/**
 * FastModeProgressIndicator
 * 
 * Displays progress for Fast Mode parallel transcription.
 * Shows chunks completed, worker status, and ETA.
 */

"use client";

import React from 'react';
import { Zap, Users } from 'lucide-react';
import type { FastModeProgress } from '@/types/fast-mode';

interface FastModeProgressIndicatorProps {
  /** Progress information */
  progress: FastModeProgress;
}

export function FastModeProgressIndicator({ progress }: FastModeProgressIndicatorProps) {
  const { phase, percent, chunksCompleted, chunksTotal, workersActive, etaSeconds } = progress;

  if (phase === 'idle' || phase === 'complete' || phase === 'error') {
    return null;
  }

  const formatETA = (seconds?: number): string => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-br from-amber-950/30 to-orange-950/30 border border-amber-500/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-300">Fast Mode Processing</h3>
      </div>

      {/* Phase */}
      <div className="mb-3">
        <p className="text-xs text-zinc-400 capitalize mb-1">{phase}</p>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">{percent}% complete</p>
      </div>

      {/* Chunks Progress */}
      {chunksTotal > 0 && (
        <div className="mb-3">
          <p className="text-xs text-zinc-300 mb-1">
            Processing chunk <span className="font-semibold">{chunksCompleted}</span> of{' '}
            <span className="font-semibold">{chunksTotal}</span>
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="w-3 h-3" />
            <span>{workersActive} worker{workersActive !== 1 ? 's' : ''} active</span>
          </div>
        </div>
      )}

      {/* ETA */}
      {etaSeconds !== undefined && etaSeconds > 0 && (
        <div className="pt-2 border-t border-amber-500/20">
          <p className="text-xs text-zinc-400">
            Estimated time remaining: <span className="font-semibold text-amber-300">{formatETA(etaSeconds)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
