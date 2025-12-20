"use client";

/**
 * Analysis Tab View
 * 
 * Displays AI-powered analysis of the transcript including:
 * - Key points and summary
 * - Questions raised (explicit and implicit)
 * - Deviations and misalignments
 * - Resolutions and decisions
 * - Significant statements
 * - Action items
 */

import { useState } from "react";
import { 
  Lightbulb, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare,
  ListTodo,
  Gavel,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import type { TranscriptAnalysis } from "@/types/transcript-analysis";

interface AnalysisTabViewProps {
  analysis: TranscriptAnalysis | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AnalysisTabView({
  analysis,
  isLoading = false,
  error = null,
  onRetry,
}: AnalysisTabViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'keyPoints'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-zinc-400">Analyzing transcript...</p>
        <p className="text-sm text-zinc-500">This may take a minute</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <p className="text-zinc-300 font-medium">Analysis Failed</p>
        <p className="text-sm text-zinc-500 max-w-md text-center">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-zinc-400">
        <Lightbulb className="w-16 h-16" />
        <p>No analysis available</p>
        <p className="text-sm text-zinc-500">Click "Analyze" to generate insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with metadata */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-zinc-100">AI Analysis</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          {analysis.speakerCount && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {analysis.speakerCount} speakers
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {analysis.processingTime.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Summary */}
      <CollapsibleSection
        title="Summary"
        icon={<MessageSquare className="w-4 h-4" />}
        expanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
        badge={null}
      >
        <p className="text-zinc-200 leading-relaxed">{analysis.summary}</p>
        {analysis.mainTopics && analysis.mainTopics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.mainTopics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Key Points */}
      <CollapsibleSection
        title="Key Points"
        icon={<Lightbulb className="w-4 h-4" />}
        expanded={expandedSections.has('keyPoints')}
        onToggle={() => toggleSection('keyPoints')}
        badge={analysis.keyPoints.length}
      >
        <ul className="space-y-2">
          {analysis.keyPoints.map((point, i) => (
            <li key={i} className="flex gap-2 text-zinc-200">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Questions Raised */}
      {(analysis.questionsRaised.explicit.length > 0 || analysis.questionsRaised.implicit.length > 0) && (
        <CollapsibleSection
          title="Questions Raised"
          icon={<HelpCircle className="w-4 h-4" />}
          expanded={expandedSections.has('questions')}
          onToggle={() => toggleSection('questions')}
          badge={analysis.questionsRaised.total || (analysis.questionsRaised.explicit.length + analysis.questionsRaised.implicit.length)}
        >
          {analysis.questionsRaised.explicit.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <span>Explicit Questions</span>
                <span className="text-xs text-zinc-500">({analysis.questionsRaised.explicit.length})</span>
              </h4>
              <ul className="space-y-3">
                {analysis.questionsRaised.explicit.map((q, i) => (
                  <li key={i} className="pl-3 border-l-2 border-green-500/30">
                    <p className="text-zinc-200">{q.text}</p>
                    {q.answered && q.answerText && (
                      <p className="mt-1 text-sm text-zinc-400">
                        <span className="text-green-400">✓ Answer:</span> {q.answerText}
                      </p>
                    )}
                    {q.speaker && (
                      <p className="mt-1 text-xs text-zinc-500">— {q.speaker}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.questionsRaised.implicit.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <span>Implicit Questions</span>
                <span className="text-xs text-zinc-500">({analysis.questionsRaised.implicit.length})</span>
              </h4>
              <ul className="space-y-3">
                {analysis.questionsRaised.implicit.map((q, i) => (
                  <li key={i} className="pl-3 border-l-2 border-yellow-500/30">
                    <p className="text-zinc-200">{q.text}</p>
                    {q.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-500/10 rounded text-xs text-yellow-400">
                        {q.category}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Deviations */}
      {analysis.deviations && analysis.deviations.length > 0 && (
        <CollapsibleSection
          title="Deviations"
          icon={<AlertTriangle className="w-4 h-4" />}
          expanded={expandedSections.has('deviations')}
          onToggle={() => toggleSection('deviations')}
          badge={analysis.deviations.length}
        >
          <ul className="space-y-3">
            {analysis.deviations.map((dev, i) => (
              <li key={i} className={`p-3 rounded-lg border ${
                dev.severity === 'high' ? 'bg-red-950/20 border-red-500/30' :
                dev.severity === 'medium' ? 'bg-orange-950/20 border-orange-500/30' :
                'bg-yellow-950/20 border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    dev.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                    dev.severity === 'medium' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {dev.severity}
                  </span>
                  <div className="flex-1">
                    <p className="text-zinc-200">{dev.description}</p>
                    <p className="mt-1 text-sm text-zinc-400">{dev.context}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Misalignments */}
      {analysis.misalignments && analysis.misalignments.length > 0 && (
        <CollapsibleSection
          title="Misalignments"
          icon={<Users className="w-4 h-4" />}
          expanded={expandedSections.has('misalignments')}
          onToggle={() => toggleSection('misalignments')}
          badge={analysis.misalignments.length}
        >
          <ul className="space-y-3">
            {analysis.misalignments.map((mis, i) => (
              <li key={i} className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg">
                <p className="text-zinc-200 font-medium mb-1">{mis.topic}</p>
                <p className="text-sm text-zinc-400 mb-2">{mis.description}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Parties:</span>
                  {mis.parties.map((party, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-500/20 rounded text-purple-300">
                      {party}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Resolutions */}
      {analysis.resolutions && analysis.resolutions.length > 0 && (
        <CollapsibleSection
          title="Resolutions"
          icon={<CheckCircle2 className="w-4 h-4" />}
          expanded={expandedSections.has('resolutions')}
          onToggle={() => toggleSection('resolutions')}
          badge={analysis.resolutions.length}
        >
          <ul className="space-y-3">
            {analysis.resolutions.map((res, i) => (
              <li key={i} className="p-3 bg-green-950/20 border border-green-500/30 rounded-lg">
                <p className="text-zinc-200 font-medium mb-1">Issue: {res.issue}</p>
                <p className="text-green-300 text-sm mb-1">✓ Solution: {res.solution}</p>
                <p className="text-xs text-zinc-500">{res.context}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Significant Statements */}
      {analysis.significantStatements && analysis.significantStatements.length > 0 && (
        <CollapsibleSection
          title="Significant Statements"
          icon={<MessageSquare className="w-4 h-4" />}
          expanded={expandedSections.has('statements')}
          onToggle={() => toggleSection('statements')}
          badge={analysis.significantStatements.length}
        >
          <ul className="space-y-2">
            {analysis.significantStatements.map((stmt, i) => (
              <li key={i} className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    stmt.significance === 'high' ? 'bg-red-500/20 text-red-300' :
                    stmt.significance === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {stmt.category}
                  </span>
                  <p className="flex-1 text-zinc-200 text-sm">{stmt.text}</p>
                </div>
                {stmt.speaker && (
                  <p className="mt-1 text-xs text-zinc-500">— {stmt.speaker}</p>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Action Items */}
      {analysis.actionItems && analysis.actionItems.length > 0 && (
        <CollapsibleSection
          title="Action Items"
          icon={<ListTodo className="w-4 h-4" />}
          expanded={expandedSections.has('actions')}
          onToggle={() => toggleSection('actions')}
          badge={analysis.actionItems.length}
        >
          <ul className="space-y-2">
            {analysis.actionItems.map((action, i) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                <input type="checkbox" className="mt-1" />
                <div className="flex-1">
                  <p className="text-zinc-200">{action.description}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {action.assignedTo && (
                      <span className="text-zinc-400">Assigned: <span className="text-blue-300">{action.assignedTo}</span></span>
                    )}
                    <span className={`px-2 py-0.5 rounded ${
                      action.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                      action.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {action.priority}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Decisions */}
      {analysis.decisions && analysis.decisions.length > 0 && (
        <CollapsibleSection
          title="Decisions Made"
          icon={<Gavel className="w-4 h-4" />}
          expanded={expandedSections.has('decisions')}
          onToggle={() => toggleSection('decisions')}
          badge={analysis.decisions.length}
        >
          <ul className="space-y-3">
            {analysis.decisions.map((decision, i) => (
              <li key={i} className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg">
                <p className="text-zinc-200 font-medium mb-1">{decision.description}</p>
                <p className="text-indigo-300 text-sm mb-1">→ {decision.outcome}</p>
                {decision.rationale && (
                  <p className="text-xs text-zinc-500 italic">{decision.rationale}</p>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  badge: number | null;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  badge,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400">{icon}</span>
          <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
          {badge !== null && badge > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default AnalysisTabView;

