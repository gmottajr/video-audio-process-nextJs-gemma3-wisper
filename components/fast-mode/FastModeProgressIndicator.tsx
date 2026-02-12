/**
 * FastModeProgressIndicator
 * 
 * Displays progress for Fast Mode parallel transcription.
 * Shows chunks completed, worker status, and ETA.
 */

"use client";

import React from 'react';
import { Layers, Cpu, Clock } from 'lucide-react';
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
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Get phase display label
  const getPhaseLabel = (p: string): string => {
    switch (p) {
      case 'initializing': return 'Initializing';
      case 'chunking': return 'Preparing Audio';
      case 'processing': return 'Transcribing';
      case 'merging': return 'Merging Results';
      default: return p.charAt(0).toUpperCase() + p.slice(1);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
      {/* Phase badge and percentage */}
      <div className="flex items-center justify-between mb-4">
        <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full border border-amber-500/30">
          {getPhaseLabel(phase)}
        </span>
        <span className="text-2xl font-bold text-white">{percent}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-zinc-800/50 rounded-full h-3 mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 h-3 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${percent}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Chunks */}
        <div className="p-4 bg-zinc-800/30 rounded-xl text-center border border-zinc-700/50">
          <div className="flex items-center justify-center mb-2">
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {chunksCompleted}<span className="text-zinc-500 text-lg">/{chunksTotal}</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">Chunks</p>
        </div>
        
        {/* Workers */}
        <div className="p-4 bg-zinc-800/30 rounded-xl text-center border border-zinc-700/50">
          <div className="flex items-center justify-center mb-2">
            <Cpu className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{workersActive}</p>
          <p className="text-xs text-zinc-500 mt-1">Workers</p>
        </div>
        
        {/* ETA */}
        <div className="p-4 bg-zinc-800/30 rounded-xl text-center border border-zinc-700/50">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">{formatETA(etaSeconds)}</p>
          <p className="text-xs text-zinc-500 mt-1">ETA</p>
        </div>
      </div>
    </div>
  );
}
