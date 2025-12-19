"use client";

/**
 * Side-by-Side Tab View
 * 
 * Displays original and enhanced transcriptions in two columns for comparison.
 * Users can see both versions simultaneously to understand changes.
 * 
 * Phase 4.5: Added synchronized scrolling
 */

import { useMemo, useRef, useCallback, useState } from "react";
import { FileText, Sparkles, TrendingDown, TrendingUp, ArrowRight, Link2, Link2Off } from "lucide-react";
import { formatNumber, compareTexts } from "@/utils/textStatistics";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";

interface SideBySideTabViewProps {
  /** Original transcript text */
  originalText: string;
  /** Enhanced transcript text */
  enhancedText: string;
  /** Quality metrics from Phase 3 */
  qualityMetrics?: EnhancementQualityMetrics | null;
  /** Phase 4.5: Whether scrolling is synchronized */
  syncScroll?: boolean;
  /** Phase 4.5: Callback when sync scroll changes */
  onSyncScrollChange?: (enabled: boolean) => void;
  /** Optional className */
  className?: string;
}

export function SideBySideTabView({
  originalText,
  enhancedText,
  qualityMetrics,
  syncScroll = true,
  onSyncScrollChange,
  className = "",
}: SideBySideTabViewProps) {
  // Refs for scroll containers
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  
  // Calculate comparison statistics
  const comparison = useMemo(() => 
    compareTexts(originalText, enhancedText),
    [originalText, enhancedText]
  );
  
  // Phase 4.5: Handle synchronized scrolling
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isScrollingRef.current) return;
    
    isScrollingRef.current = true;
    
    const sourceEl = source === 'left' ? leftRef.current : rightRef.current;
    const targetEl = source === 'left' ? rightRef.current : leftRef.current;
    
    if (sourceEl && targetEl) {
      // Calculate scroll percentage
      const scrollPercentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
      const targetScrollTop = scrollPercentage * (targetEl.scrollHeight - targetEl.clientHeight);
      
      targetEl.scrollTop = targetScrollTop;
    }
    
    // Reset flag after a small delay to allow the sync scroll to complete
    requestAnimationFrame(() => {
      isScrollingRef.current = false;
    });
  }, [syncScroll]);
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Comparison Summary Bar */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-950/30 to-cyan-950/30 border border-blue-500/20 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4">
          {/* Word Change */}
          <div className="flex items-center gap-2">
            {comparison.wordDelta < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-400" />
            ) : comparison.wordDelta > 0 ? (
              <TrendingUp className="w-4 h-4 text-orange-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            )}
            <span className="text-zinc-400">Words:</span>
            <span className="font-medium text-zinc-200">
              {formatNumber(comparison.originalStats.wordCount)}
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className={`font-medium ${
              comparison.wordDelta < 0 ? 'text-green-400' : 
              comparison.wordDelta > 0 ? 'text-orange-400' : 
              'text-zinc-200'
            }`}>
              {formatNumber(comparison.enhancedStats.wordCount)}
            </span>
            <span className="text-xs text-zinc-500">
              ({comparison.wordDelta > 0 ? '+' : ''}{comparison.wordDelta})
            </span>
          </div>

          <div className="w-px h-4 bg-zinc-700 hidden sm:block" />

          {/* Compression */}
          {comparison.compressionPercent !== 0 && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Reduction:</span>
              <span className={`font-medium ${
                comparison.compressionPercent > 0 ? 'text-green-400' : 'text-orange-400'
              }`}>
                {comparison.compressionPercent > 0 ? '-' : '+'}
                {Math.abs(comparison.compressionPercent)}%
              </span>
            </div>
          )}

          {qualityMetrics && (
            <>
              <div className="w-px h-4 bg-zinc-700 hidden sm:block" />
              
              {/* Quality Score */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Quality:</span>
                <span className={`font-medium ${
                  qualityMetrics.qualityScore >= 80 ? 'text-green-400' :
                  qualityMetrics.qualityScore >= 60 ? 'text-blue-400' :
                  'text-yellow-400'
                }`}>
                  {qualityMetrics.qualityScore}/100
                </span>
              </div>
            </>
          )}
          </div>
          
          {/* Phase 4.5: Sync Scroll Toggle */}
          <button
            onClick={() => onSyncScrollChange?.(!syncScroll)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              syncScroll
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:bg-zinc-700/50"
            }`}
            title={syncScroll ? "Disable synchronized scrolling" : "Enable synchronized scrolling"}
          >
            {syncScroll ? (
              <Link2 className="w-3.5 h-3.5" />
            ) : (
              <Link2Off className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Sync Scroll</span>
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Original Column */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
            <div className="p-1.5 bg-zinc-800 rounded">
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Original
              </h4>
              <p className="text-xs text-zinc-500">
                {formatNumber(comparison.originalStats.wordCount)} words
              </p>
            </div>
          </div>
          
          <div 
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            className="flex-1 max-h-[350px] overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
            style={{ scrollbarGutter: 'stable' }}
          >
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm select-text">
              {originalText || "No original text available."}
            </p>
          </div>
        </div>

        {/* Enhanced Column */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-500/30">
            <div className="p-1.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                Enhanced
                {qualityMetrics && qualityMetrics.qualityScore >= 70 && (
                  <span className="text-green-400 text-xs">✓</span>
                )}
              </h4>
              <p className="text-xs text-purple-400/70">
                {formatNumber(comparison.enhancedStats.wordCount)} words
              </p>
            </div>
          </div>
          
          <div 
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            className="flex-1 max-h-[350px] overflow-y-auto bg-purple-950/20 border border-purple-500/30 rounded-lg p-4"
            style={{ scrollbarGutter: 'stable' }}
          >
            <p className="text-zinc-100 leading-relaxed whitespace-pre-wrap font-mono text-sm select-text">
              {enhancedText || "No enhanced text available."}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Statistics */}
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          <div>
            <span className="text-zinc-500 block">Sentences</span>
            <span className="text-zinc-300 font-medium">
              {comparison.originalStats.sentenceCount} → {comparison.enhancedStats.sentenceCount}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Avg Words/Sentence</span>
            <span className="text-zinc-300 font-medium">
              {comparison.originalStats.avgWordsPerSentence} → {comparison.enhancedStats.avgWordsPerSentence}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Characters</span>
            <span className="text-zinc-300 font-medium">
              {formatNumber(comparison.originalStats.characterCount)} → {formatNumber(comparison.enhancedStats.characterCount)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Read Time</span>
            <span className="text-zinc-300 font-medium">
              {comparison.originalStats.readingTimeMinutes} → {comparison.enhancedStats.readingTimeMinutes} min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideBySideTabView;

