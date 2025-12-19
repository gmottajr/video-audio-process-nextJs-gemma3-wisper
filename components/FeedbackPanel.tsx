"use client";

/**
 * FeedbackPanel Component
 * 
 * Collects user feedback on enhancement quality.
 * Shows star rating, issue selection (if rating < 4), and optional comments.
 */

import React, { useState, useCallback } from 'react';
import { Star, X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import type { FeedbackIssue, UserPreferences } from '@/types/quality-metrics';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackPanelProps {
  /** Enhancement ID to attach feedback to */
  enhancementId: string;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback when feedback is submitted */
  onSubmit: (feedback: {
    rating: 1 | 2 | 3 | 4 | 5;
    issues?: FeedbackIssue[];
    comments?: string;
    preferences?: UserPreferences;
  }) => void;
  /** Optional: Pre-fill with existing feedback */
  existingFeedback?: {
    rating?: 1 | 2 | 3 | 4 | 5;
    issues?: FeedbackIssue[];
    comments?: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ISSUE_OPTIONS: { value: FeedbackIssue; label: string; description: string }[] = [
  { value: 'tone_wrong', label: 'Wrong Tone', description: 'Tone doesn\'t match original' },
  { value: 'meaning_changed', label: 'Meaning Changed', description: 'AI altered the meaning' },
  { value: 'too_formal', label: 'Too Formal', description: 'Over-formalized casual speech' },
  { value: 'too_casual', label: 'Too Casual', description: 'Made it too informal' },
  { value: 'lost_context', label: 'Lost Context', description: 'Important info was lost' },
  { value: 'technical_errors', label: 'Technical Errors', description: 'Mishandled tech terms' },
  { value: 'grammar_issues', label: 'Grammar Issues', description: 'Introduced grammar problems' },
  { value: 'incomplete', label: 'Incomplete', description: 'Enhancement was cut off' },
  { value: 'too_aggressive', label: 'Too Aggressive', description: 'Removed too much' },
  { value: 'not_enough', label: 'Not Enough', description: 'Didn\'t improve enough' },
  { value: 'other', label: 'Other', description: 'Something else' },
];

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// ============================================================================
// COMPONENT
// ============================================================================

export function FeedbackPanel({
  enhancementId,
  isVisible,
  onClose,
  onSubmit,
  existingFeedback,
}: FeedbackPanelProps) {
  // State
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(existingFeedback?.rating || null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<FeedbackIssue[]>(existingFeedback?.issues || []);
  const [comments, setComments] = useState(existingFeedback?.comments || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handlers
  const handleRatingClick = useCallback((value: 1 | 2 | 3 | 4 | 5) => {
    setRating(value);
    // Reset issues if rating is good
    if (value >= 4) {
      setSelectedIssues([]);
    }
  }, []);

  const toggleIssue = useCallback((issue: FeedbackIssue) => {
    setSelectedIssues(prev => 
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!rating) return;

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        rating,
        issues: selectedIssues.length > 0 ? selectedIssues : undefined,
        comments: comments.trim() || undefined,
      });
      
      setIsSubmitted(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[FeedbackPanel] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, selectedIssues, comments, onSubmit, onClose]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Don't render if not visible
  if (!isVisible) return null;

  // Success state
  if (isSubmitted) {
    return (
      <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-6 mt-4">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <span className="text-green-300 font-medium">Thanks for your feedback!</span>
        </div>
      </div>
    );
  }

  const showIssues = rating !== null && rating < 4;
  const displayRating = hoveredRating || rating || 0;

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-xl p-6 mt-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Rate this enhancement</h3>
        <button
          onClick={handleSkip}
          className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
          aria-label="Close feedback panel"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Star Rating */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRatingClick(value as 1 | 2 | 3 | 4 | 5)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded"
              aria-label={`Rate ${value} stars`}
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  value <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              />
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-3 text-slate-300 font-medium">
              {RATING_LABELS[displayRating]}
            </span>
          )}
        </div>
      </div>

      {/* Issue Selection (shown if rating < 4) */}
      {showIssues && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-300">What could be improved?</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ISSUE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleIssue(option.value)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                  selectedIssues.includes(option.value)
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                }`}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Additional comments (optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, 500))}
          placeholder="Tell us more about your experience..."
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          rows={3}
        />
        <div className="text-xs text-slate-500 mt-1 text-right">
          {comments.length}/500
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={!rating || isSubmitting}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            rating && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default FeedbackPanel;

