"use client";

/**
 * Enhanced Tab View
 * 
 * Displays the AI-enhanced transcription with improvement indicators.
 * This is the primary result view - users want to see the improved version prominently.
 * 
 * Phase 4.5: Added editable text support
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, TrendingUp, TrendingDown, Clock, Hash, AlignLeft, Zap, Edit3 } from "lucide-react";
import { getTextStatistics, formatNumber } from "@/utils/textStatistics";
import type { EnhancementQualityMetrics, ReadabilityScore } from "@/types/quality-metrics";

interface EnhancedTabViewProps {
  /** The enhanced transcript text */
  text: string;
  /** Quality metrics from Phase 3 */
  qualityMetrics?: EnhancementQualityMetrics | null;
  /** Optional readability score */
  readabilityScore?: ReadabilityScore;
  /** Processing time in seconds */
  processingTime?: number;
  /** Phase 4.5: Whether editing is enabled */
  isEditable?: boolean;
  /** Phase 4.5: Callback when text is edited */
  onTextChange?: (newText: string) => void;
  /** Phase 4.5: Whether the text has been edited */
  hasEdits?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Get readability difficulty label
 */
function getReadabilityLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Very Easy", color: "text-green-400" };
  if (score >= 80) return { label: "Easy", color: "text-green-400" };
  if (score >= 70) return { label: "Fairly Easy", color: "text-blue-400" };
  if (score >= 60) return { label: "Standard", color: "text-blue-400" };
  if (score >= 50) return { label: "Fairly Hard", color: "text-yellow-400" };
  if (score >= 30) return { label: "Hard", color: "text-orange-400" };
  return { label: "Very Hard", color: "text-red-400" };
}

export function EnhancedTabView({ 
  text, 
  qualityMetrics,
  readabilityScore,
  processingTime,
  isEditable = false,
  onTextChange,
  hasEdits = false,
  className = "" 
}: EnhancedTabViewProps) {
  // First view highlight animation
  const [showHighlight, setShowHighlight] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowHighlight(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditable && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditable]);
  
  // Calculate statistics
  const stats = useMemo(() => getTextStatistics(text), [text]);
  
  // Get readability info
  const readability = useMemo(() => {
    const score = readabilityScore?.fleschKincaidReadingEase ?? 
                  qualityMetrics?.readabilityAfter?.fleschKincaidReadingEase;
    if (!score) return null;
    return {
      score: Math.round(score),
      ...getReadabilityLabel(score),
    };
  }, [readabilityScore, qualityMetrics]);

  // Build improvements list
  const improvements = useMemo(() => {
    if (!qualityMetrics) return [];
    
    const items: Array<{ icon: React.ReactNode; text: string; color: string }> = [];
    
    if (qualityMetrics.fillerWordsRemoved > 0) {
      items.push({
        icon: <TrendingDown className="w-4 h-4" />,
        text: `Removed ${qualityMetrics.fillerWordsRemoved} filler word${qualityMetrics.fillerWordsRemoved !== 1 ? 's' : ''}`,
        color: "text-green-400",
      });
    }
    
    if (qualityMetrics.readabilityImprovement > 3) {
      items.push({
        icon: <TrendingUp className="w-4 h-4" />,
        text: `Improved readability +${Math.round(qualityMetrics.readabilityImprovement)} points`,
        color: "text-blue-400",
      });
    }
    
    if (qualityMetrics.reductionPercentage > 5) {
      items.push({
        icon: <Zap className="w-4 h-4" />,
        text: `Reduced length ${Math.round(qualityMetrics.reductionPercentage)}%`,
        color: "text-purple-400",
      });
    }
    
    if (qualityMetrics.sentimentPreserved) {
      items.push({
        icon: <span className="text-sm">✓</span>,
        text: "Sentiment preserved",
        color: "text-emerald-400",
      });
    }
    
    return items;
  }, [qualityMetrics]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            isEditable 
              ? "bg-gradient-to-br from-amber-600 to-orange-600" 
              : "bg-gradient-to-br from-purple-600 to-pink-600"
          }`}>
            {isEditable ? (
              <Edit3 className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-purple-200">
              {isEditable ? "Edit Mode" : hasEdits ? "Edited Transcription" : "Enhanced Transcription"}
            </h3>
            <p className="text-xs text-purple-400/70">
              {isEditable 
                ? "Click to edit the text below" 
                : hasEdits 
                  ? "You've made manual edits" 
                  : "AI-improved for clarity and readability"
              }
            </p>
          </div>
        </div>
        
        {/* Quality Score Badge */}
        {qualityMetrics && (
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              qualityMetrics.qualityScore >= 80 
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : qualityMetrics.qualityScore >= 60
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
            }`}>
              Quality: {qualityMetrics.qualityScore}/100
            </div>
          </div>
        )}
      </div>

      {/* Improvements Summary (if available) */}
      {improvements.length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-950/30 to-pink-950/30 border border-purple-500/20 rounded-lg">
          <h4 className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Improvements Made
          </h4>
          <ul className="space-y-1.5">
            {improvements.map((item, i) => (
              <li key={i} className={`flex items-center gap-2 text-sm ${item.color}`}>
                {item.icon}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {isEditable ? (
          /* Edit Mode - Textarea */
          <div 
            className="h-full max-h-[400px] border rounded-lg transition-all duration-500 bg-amber-950/20 border-amber-500/50"
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onTextChange?.(e.target.value)}
              className="w-full h-full min-h-[300px] max-h-[400px] p-4 bg-transparent text-zinc-100 leading-relaxed font-mono text-sm resize-none focus:outline-none"
              style={{ scrollbarGutter: 'stable' }}
              placeholder="Enhanced transcription..."
            />
          </div>
        ) : (
          /* View Mode - Paragraph */
          <div 
            className={`h-full max-h-[400px] overflow-y-auto border rounded-lg p-4 transition-all duration-500 ${
              hasEdits
                ? "bg-amber-950/20 border-amber-500/30"
                : showHighlight 
                  ? "bg-purple-950/30 border-purple-500/50 shadow-lg shadow-purple-500/10" 
                  : "bg-purple-950/20 border-purple-500/30"
            }`}
            style={{ scrollbarGutter: 'stable' }}
          >
            <p className="text-zinc-100 leading-relaxed whitespace-pre-wrap font-mono text-sm select-text">
              {text || "No enhanced transcription available."}
            </p>
          </div>
        )}
      </div>

      {/* Statistics Footer */}
      <div className="mt-4 pt-3 border-t border-purple-500/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Word Count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-400/70">Words</p>
              <p className="text-sm font-medium text-purple-200">
                {formatNumber(stats.wordCount)}
              </p>
            </div>
          </div>

          {/* Sentence Count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded">
              <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-400/70">Sentences</p>
              <p className="text-sm font-medium text-purple-200">
                {formatNumber(stats.sentenceCount)}
              </p>
            </div>
          </div>

          {/* Reading Time */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-purple-400/70">Read Time</p>
              <p className="text-sm font-medium text-purple-200">
                {stats.readingTimeMinutes} min
              </p>
            </div>
          </div>

          {/* Readability (if available) */}
          {readability && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 rounded">
                <span className="text-xs">📊</span>
              </div>
              <div>
                <p className="text-xs text-purple-400/70">Readability</p>
                <p className={`text-sm font-medium ${readability.color}`}>
                  {readability.score} ({readability.label})
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Processing Time */}
        {processingTime && (
          <div className="mt-2 text-xs text-purple-400/50 text-right">
            Processed in {processingTime.toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedTabView;

