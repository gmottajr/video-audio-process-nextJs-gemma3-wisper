"use client";

/**
 * Speaker Identification Input Component
 * 
 * Allows users to provide speaker names for better transcript formatting.
 * Supports two modes:
 * 1. Quick mode: Enter first speaker name only
 * 2. Full mode: Enter all participant names
 * 
 * AI will validate and use these names (or attempt detection without them)
 */

import { useState } from "react";
import { Users, Plus, X, Check, Info, Sparkles } from "lucide-react";

export interface SpeakerNames {
  mode: 'auto' | 'first-speaker' | 'all-speakers';
  firstSpeaker?: string;
  allSpeakers?: string[];
  useAIDetection: boolean;
}

interface SpeakerIdentificationInputProps {
  onSubmit: (names: SpeakerNames) => void;  // Changed from onNamesChange to onSubmit
  initialNames?: SpeakerNames;
  speakerCount?: number; // Estimated from speaker detection
  disabled?: boolean;
}

export function SpeakerIdentificationInput({
  onSubmit,
  initialNames,
  speakerCount = 2,
  disabled = false,
}: SpeakerIdentificationInputProps) {
  const [mode, setMode] = useState<'auto' | 'first-speaker' | 'all-speakers'>(
    initialNames?.mode || 'all-speakers' // DEFAULT: Show name inputs so users can enter names
  );
  const [firstSpeaker, setFirstSpeaker] = useState(initialNames?.firstSpeaker || '');
  const [speakers, setSpeakers] = useState<string[]>(
    initialNames?.allSpeakers || Array(speakerCount).fill('')
  );
  const [useAI, setUseAI] = useState(initialNames?.useAIDetection ?? true);

  // Submit handler - only called when user clicks the button
  const handleSubmit = () => {
    // SMART MODE DETECTION: Determine mode based on what user entered
    const filledSpeakers = speakers.filter(s => s.trim());
    let actualMode = mode;
    
    // If user entered multiple speaker names, force 'all-speakers' mode
    if (filledSpeakers.length > 1) {
      actualMode = 'all-speakers';
      console.log('[SpeakerInput] User entered', filledSpeakers.length, 'names → forcing all-speakers mode');
    }
    // If user entered only first speaker name, use 'first-speaker' mode
    else if (filledSpeakers.length === 1 && mode !== 'all-speakers') {
      actualMode = 'first-speaker';
      console.log('[SpeakerInput] User entered 1 name → using first-speaker mode');
    }
    // Otherwise use auto mode
    else if (filledSpeakers.length === 0) {
      actualMode = 'auto';
      console.log('[SpeakerInput] No names entered → using auto mode');
    }
    
    onSubmit({
      mode: actualMode,
      firstSpeaker: actualMode === 'first-speaker' ? filledSpeakers[0] : undefined,
      allSpeakers: actualMode === 'all-speakers' ? filledSpeakers : undefined,
      useAIDetection: actualMode === 'auto' ? useAI : false, // CRITICAL: Don't override user names with AI!
    });
  };

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
  };

  const handleFirstSpeakerChange = (value: string) => {
    setFirstSpeaker(value);
  };

  const handleSpeakerChange = (index: number, value: string) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = value;
    setSpeakers(newSpeakers);
  };

  const addSpeaker = () => {
    setSpeakers([...speakers, '']);
  };

  const removeSpeaker = (index: number) => {
    if (speakers.length <= 2) return; // Keep at least 2 speakers
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const handleAIToggle = (enabled: boolean) => {
    setUseAI(enabled);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Speaker Identification</h3>
          <span className="text-xs text-zinc-500">
            (Detected ~{speakerCount} speakers)
          </span>
        </div>
        
        {/* AI Detection Toggle - Only shown for auto mode */}
        {mode === 'auto' && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => handleAIToggle(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50"
            />
            <span className="text-xs text-zinc-400 group-hover:text-zinc-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Auto-Detection
            </span>
          </label>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex gap-2 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg text-xs text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">📝 Enter speaker names to use them directly</p>
          <p className="text-blue-400/80">
            If you provide names (like "Nick", "Kwaku"), they will be used exactly as entered.
            Leave blank for AI to attempt automatic detection.
          </p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-400 font-medium">Input Mode</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleModeChange('auto')}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'auto'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Auto Detect
          </button>
          <button
            onClick={() => handleModeChange('first-speaker')}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'first-speaker'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            First Speaker
          </button>
          <button
            onClick={() => handleModeChange('all-speakers')}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'all-speakers'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            All Speakers
          </button>
        </div>
      </div>

      {/* Input Fields Based on Mode */}
      {mode === 'first-speaker' && (
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">
            First Speaker Name
          </label>
          <input
            type="text"
            value={firstSpeaker}
            onChange={(e) => handleFirstSpeakerChange(e.target.value)}
            placeholder="e.g., John Smith"
            disabled={disabled}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-zinc-500">
            AI will detect other speakers and order them based on speaking turns
          </p>
        </div>
      )}

      {mode === 'all-speakers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 font-medium">
              All Participants (in order of appearance)
            </label>
            <button
              onClick={addSpeaker}
              disabled={disabled || speakers.length >= 10}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {speakers.map((speaker, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => handleSpeakerChange(index, e.target.value)}
                  placeholder={`Speaker ${index + 1}`}
                  disabled={disabled}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {speakers.length > 2 && (
                  <button
                    onClick={() => removeSpeaker(index)}
                    disabled={disabled}
                    className="flex-shrink-0 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-xs text-zinc-500">
            ✅ These names will be used directly (e.g., Speaker 1 → Nick, Speaker 2 → Kwaku)
          </p>
        </div>
      )}

      {mode === 'auto' && (
        <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-purple-300 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Automatic Detection Active</span>
          </div>
          <p className="text-xs text-purple-400/80">
            AI will analyze the transcript to identify speakers based on:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-purple-400/80">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3" />
              Self-introductions and name mentions
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3" />
              Speech patterns and conversational context
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3" />
              Role indicators (interviewer, guest, host, etc.)
            </li>
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="pt-3 border-t border-zinc-700/50 text-xs text-zinc-500">
        {mode === 'auto' && (
          <p>✨ Fully automatic speaker detection</p>
        )}
        {mode === 'first-speaker' && firstSpeaker.trim() && (
          <p>
            <span className="text-purple-400">{firstSpeaker}</span> + AI detection for others
          </p>
        )}
        {mode === 'all-speakers' && speakers.filter(s => s.trim()).length > 0 && (
          <p>
            {speakers.filter(s => s.trim()).length} speaker{speakers.filter(s => s.trim()).length !== 1 ? 's' : ''} provided
            {useAI && ' (AI will validate)'}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <Sparkles className="w-4 h-4" />
        Identify Speakers
      </button>
    </div>
  );
}

export default SpeakerIdentificationInput;


