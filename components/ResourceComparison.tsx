"use client";

import { AlertCircle, CheckCircle, Zap } from "lucide-react";

interface ResourceStats {
  size: number;          // bytes
  duration: number;      // seconds
  ramEstimate: number;   // GB
  timeEstimate: number;  // seconds
}

interface ResourceComparisonProps {
  fullAudio: ResourceStats;
  segment: ResourceStats;
}

export function ResourceComparison({ fullAudio, segment }: ResourceComparisonProps) {
  const formatSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };
  
  const formatRAM = (gb: number) => {
    return `~${gb.toFixed(1)}GB`;
  };
  
  const ramReduction = ((fullAudio.ramEstimate - segment.ramEstimate) / fullAudio.ramEstimate * 100).toFixed(0);
  const timeReduction = ((fullAudio.timeEstimate - segment.timeEstimate) / fullAudio.timeEstimate * 100).toFixed(0);
  
  const isFullAudioHigh = fullAudio.ramEstimate > 50;
  const isSegmentOk = segment.ramEstimate < 30;
  
  return (
    <div className="bg-gradient-to-br from-purple-950/30 to-blue-950/30 border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-purple-100">
          📊 Resource Comparison
        </h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Full Audio Column */}
        <div className={`bg-zinc-900/50 border ${isFullAudioHigh ? 'border-red-500/30' : 'border-zinc-700'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-zinc-200">Full Audio</h4>
            {isFullAudioHigh && (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
          
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-400">Size:</dt>
              <dd className="font-medium text-zinc-200">{formatSize(fullAudio.size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Duration:</dt>
              <dd className="font-medium text-zinc-200">{formatDuration(fullAudio.duration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">RAM:</dt>
              <dd className={`font-bold ${isFullAudioHigh ? 'text-red-400' : 'text-yellow-400'}`}>
                {formatRAM(fullAudio.ramEstimate)} {isFullAudioHigh && '⚠️'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">Est. Time:</dt>
              <dd className="font-medium text-zinc-200">{formatDuration(fullAudio.timeEstimate)}</dd>
            </div>
          </dl>
        </div>
        
        {/* Selected Segment Column */}
        <div className={`bg-gradient-to-br from-green-950/30 to-emerald-950/30 border ${isSegmentOk ? 'border-green-500/30' : 'border-zinc-700'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-green-200">Selected Segment ✨</h4>
            {isSegmentOk && (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
          </div>
          
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-green-300/70">Size:</dt>
              <dd className="font-medium text-green-200">{formatSize(segment.size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-green-300/70">Duration:</dt>
              <dd className="font-medium text-green-200">{formatDuration(segment.duration)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-green-300/70">RAM:</dt>
              <dd className={`font-bold ${isSegmentOk ? 'text-green-400' : 'text-yellow-400'}`}>
                {formatRAM(segment.ramEstimate)} {isSegmentOk && '✅'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-green-300/70">Est. Time:</dt>
              <dd className="font-medium text-green-200">{formatDuration(segment.timeEstimate)}</dd>
            </div>
          </dl>
          
          {/* Savings Badge */}
          <div className="mt-4 pt-3 border-t border-green-500/20">
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full font-bold">
                {ramReduction}% less RAM!
              </span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full font-bold">
                {timeReduction}% faster!
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="mt-4 text-center text-sm text-purple-300/80">
        💡 Transcribing just the selected segment uses significantly fewer resources
      </div>
    </div>
  );
}

