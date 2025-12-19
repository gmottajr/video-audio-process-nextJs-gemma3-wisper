"use client";

/**
 * QualityMetricsDisplay Component
 * 
 * Displays enhancement quality metrics in a visual, easy-to-understand format.
 * Shows quality score, confidence, readability improvement, and detailed breakdown.
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Shield,
  BookOpen,
  Scissors,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { EnhancementQualityMetrics } from '@/types/quality-metrics';
import { getQualityLabel, getConfidenceLabel } from '@/utils/qualityMetricsCalculator';

// ============================================================================
// TYPES
// ============================================================================

interface QualityMetricsDisplayProps {
  /** Quality metrics to display */
  metrics: EnhancementQualityMetrics;
  /** Whether to show expanded details by default */
  defaultExpanded?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function QualityScoreCircle({ score }: { score: number }) {
  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 80) return { ring: 'stroke-green-500', text: 'text-green-400', bg: 'bg-green-500/20' };
    if (score >= 60) return { ring: 'stroke-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (score >= 40) return { ring: 'stroke-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { ring: 'stroke-red-500', text: 'text-red-400', bg: 'bg-red-500/20' };
  };
  
  const colors = getColor(score);
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="56"
          cy="56"
          r="40"
          className="stroke-slate-700"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="56"
          cy="56"
          r="40"
          className={`${colors.ring} transition-all duration-1000 ease-out`}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function MetricBadge({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  color = 'slate',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'blue' | 'amber' | 'red' | 'slate';
}) {
  const colorClasses = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    slate: 'bg-slate-700/50 border-slate-600/50 text-slate-300',
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colorClasses[color]}`}>
      <Icon className="w-5 h-5" />
      <div className="flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
      {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
    </div>
  );
}

function BreakdownBar({ 
  label, 
  points, 
  maxPoints,
  isPositive = true,
}: {
  label: string;
  points: number;
  maxPoints: number;
  isPositive?: boolean;
}) {
  const percentage = Math.abs(points) / maxPoints * 100;
  const barColor = points > 0 ? 'bg-green-500' : points < 0 ? 'bg-red-500' : 'bg-slate-600';
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={points > 0 ? 'text-green-400' : points < 0 ? 'text-red-400' : 'text-slate-400'}>
          {points > 0 ? '+' : ''}{points}
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QualityMetricsDisplay({
  metrics,
  defaultExpanded = false,
  compact = false,
}: QualityMetricsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const qualityLabel = getQualityLabel(metrics.qualityScore);
  const confidenceLabel = getConfidenceLabel(metrics.confidenceScore);
  
  // Determine overall status
  const isGoodQuality = metrics.qualityScore >= 70;
  const isHighConfidence = metrics.confidenceScore >= 0.7;
  
  // Readability trend
  const readabilityTrend = metrics.readabilityImprovement > 0 ? 'up' : 
                          metrics.readabilityImprovement < 0 ? 'down' : 'neutral';
  
  if (compact) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-2">
          {isGoodQuality ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span className="font-medium text-white">
            Quality: {metrics.qualityScore}/100
          </span>
          <span className="text-slate-400">({qualityLabel})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shield className="w-4 h-4" />
          <span>{Math.round(metrics.confidenceScore * 100)}% confident</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto p-1 hover:bg-slate-700/50 rounded"
        >
          <Info className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Quality Score Circle */}
          <QualityScoreCircle score={metrics.qualityScore} />
          
          {/* Main Stats */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {isGoodQuality ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                {qualityLabel} Enhancement
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {confidenceLabel} • {Math.round(metrics.confidenceScore * 100)}% confidence
              </p>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricBadge
                icon={BookOpen}
                label="Readability"
                value={`${metrics.readabilityImprovement > 0 ? '+' : ''}${metrics.readabilityImprovement}`}
                trend={readabilityTrend}
                color={metrics.readabilityImprovement > 0 ? 'green' : metrics.readabilityImprovement < 0 ? 'red' : 'slate'}
              />
              <MetricBadge
                icon={Scissors}
                label="Compression"
                value={`${Math.round((1 - metrics.compressionRatio) * 100)}% shorter`}
                color={metrics.compressionRatio <= 0.95 && metrics.compressionRatio >= 0.65 ? 'green' : 'slate'}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Expandable Details */}
      <div className="border-t border-slate-700/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm text-slate-400 hover:bg-slate-700/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Detailed Breakdown
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6 space-y-6">
            {/* Quality Score Breakdown */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Score Breakdown</h4>
              <div className="space-y-3">
                <BreakdownBar 
                  label="Base Score" 
                  points={metrics.qualityBreakdown.baseScore} 
                  maxPoints={50} 
                />
                <BreakdownBar 
                  label="Readability" 
                  points={metrics.qualityBreakdown.readabilityPoints} 
                  maxPoints={20} 
                />
                <BreakdownBar 
                  label="Compression" 
                  points={metrics.qualityBreakdown.compressionPoints} 
                  maxPoints={15} 
                />
                <BreakdownBar 
                  label="Sentiment" 
                  points={metrics.qualityBreakdown.sentimentPoints} 
                  maxPoints={10} 
                />
                <BreakdownBar 
                  label="Technical Terms" 
                  points={metrics.qualityBreakdown.technicalPoints} 
                  maxPoints={10} 
                />
                <BreakdownBar 
                  label="Filler Removal" 
                  points={metrics.qualityBreakdown.fillerPoints} 
                  maxPoints={10} 
                />
                {metrics.qualityBreakdown.penaltyPoints < 0 && (
                  <BreakdownBar 
                    label="Penalties" 
                    points={metrics.qualityBreakdown.penaltyPoints} 
                    maxPoints={15} 
                    isPositive={false}
                  />
                )}
              </div>
            </div>
            
            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Word Count</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Original</span>
                    <span className="text-white">{metrics.originalWordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enhanced</span>
                    <span className="text-white">{metrics.enhancedWordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Removed</span>
                    <span className="text-red-400">-{metrics.wordsRemoved}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-300">Preservation</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Technical Terms</span>
                    <span className="text-white">{metrics.technicalTermsPreserved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Numbers</span>
                    <span className="text-white">{metrics.numbersPreserved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sentiment</span>
                    <span className={metrics.sentimentPreserved ? 'text-green-400' : 'text-red-400'}>
                      {metrics.sentimentPreserved ? 'Preserved' : 'Changed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Readability Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Readability Scores</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-slate-400">Before</div>
                  <div className="text-white">
                    Reading Ease: {metrics.readabilityBefore.fleschKincaidReadingEase}
                  </div>
                  <div className="text-slate-400 text-xs">
                    Grade Level: {metrics.readabilityBefore.fleschKincaidGradeLevel}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">After</div>
                  <div className="text-white">
                    Reading Ease: {metrics.readabilityAfter.fleschKincaidReadingEase}
                  </div>
                  <div className="text-slate-400 text-xs">
                    Grade Level: {metrics.readabilityAfter.fleschKincaidGradeLevel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QualityMetricsDisplay;

