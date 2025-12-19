"use client";

/**
 * Diff Tab View
 * 
 * Inline view showing exactly what changed with color-coded highlighting.
 * Power users can see precise changes made by the AI.
 */

import { useMemo } from "react";
import { GitCompare, Plus, Minus, Equal } from "lucide-react";
import { diffWords, getDiffWordCounts, type DiffPart } from "@/utils/diffUtils";

interface DiffTabViewProps {
  /** Original transcript text */
  originalText: string;
  /** Enhanced transcript text */
  enhancedText: string;
  /** Optional className */
  className?: string;
}

export function DiffTabView({
  originalText,
  enhancedText,
  className = "",
}: DiffTabViewProps) {
  // Compute diff
  const diff = useMemo(() => 
    diffWords(originalText, enhancedText),
    [originalText, enhancedText]
  );
  
  // Calculate statistics
  const stats = useMemo(() => 
    getDiffWordCounts(diff),
    [diff]
  );
  
  // Check if there are any changes
  const hasChanges = stats.addedWords > 0 || stats.removedWords > 0;
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
            <GitCompare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cyan-200">Changes View</h3>
            <p className="text-xs text-cyan-400/70">Color-coded differences between versions</p>
          </div>
        </div>
        
        {/* Change Summary */}
        <div className="flex items-center gap-3 text-xs">
          {stats.removedWords > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <Minus className="w-3 h-3" />
              <span>{stats.removedWords} removed</span>
            </div>
          )}
          {stats.addedWords > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <Plus className="w-3 h-3" />
              <span>{stats.addedWords} added</span>
            </div>
          )}
          {!hasChanges && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Equal className="w-3 h-3" />
              <span>No changes</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded line-through">
              removed
            </span>
            <span className="text-zinc-500">Deleted text</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded underline decoration-wavy">
              added
            </span>
            <span className="text-zinc-500">New text</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-zinc-300">
              unchanged
            </span>
            <span className="text-zinc-500">Same text</span>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 min-h-0">
        <div 
          className="h-full max-h-[350px] overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
          style={{ scrollbarGutter: 'stable' }}
        >
          {!hasChanges ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Equal className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No differences found</p>
              <p className="text-xs mt-1">Original and enhanced texts are identical</p>
            </div>
          ) : (
            <p className="leading-relaxed text-sm">
              {diff.map((part, index) => (
                <DiffSpan key={index} part={part} />
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Footer */}
      {hasChanges && (
        <div className="mt-4 pt-3 border-t border-zinc-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 bg-red-950/20 border border-red-500/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                <Minus className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-red-400">{stats.removedWords}</p>
              <p className="text-xs text-red-400/70">Words Removed</p>
            </div>
            
            <div className="p-2 bg-green-950/20 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                <Plus className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-green-400">{stats.addedWords}</p>
              <p className="text-xs text-green-400/70">Words Added</p>
            </div>
            
            <div className="p-2 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <Equal className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-zinc-300">{stats.unchangedWords}</p>
              <p className="text-xs text-zinc-500">Words Unchanged</p>
            </div>
          </div>
          
          {/* Net Change */}
          <div className="mt-3 text-center text-sm">
            <span className="text-zinc-500">Net change: </span>
            <span className={`font-medium ${
              stats.addedWords - stats.removedWords > 0 
                ? 'text-orange-400' 
                : stats.addedWords - stats.removedWords < 0
                  ? 'text-green-400'
                  : 'text-zinc-400'
            }`}>
              {stats.addedWords - stats.removedWords > 0 ? '+' : ''}
              {stats.addedWords - stats.removedWords} words
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Render a single diff part with appropriate styling
 */
function DiffSpan({ part }: { part: DiffPart }) {
  if (part.removed) {
    return (
      <span 
        className="inline bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1 mx-0.5 line-through"
        title="Removed"
      >
        {part.value}
      </span>
    );
  }
  
  if (part.added) {
    return (
      <span 
        className="inline bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1 mx-0.5 underline decoration-wavy decoration-green-500/50"
        title="Added"
      >
        {part.value}
      </span>
    );
  }
  
  return <span className="text-zinc-300">{part.value}</span>;
}

export default DiffTabView;

