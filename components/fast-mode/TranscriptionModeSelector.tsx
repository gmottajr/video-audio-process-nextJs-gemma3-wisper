/**
 * TranscriptionModeSelector
 * 
 * Radio button selector for Standard vs Fast transcription modes.
 * Follows accessibility best practices with fieldset/legend.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Globe, Clock, AlertTriangle } from 'lucide-react';
import type { TranscriptionMode } from '@/types/fast-mode';
import { FastModeInfoPopover } from './FastModeInfoPopover';

interface TranscriptionModeSelectorProps {
  /** Selected mode */
  selectedMode: TranscriptionMode;
  /** Callback when mode changes */
  onModeChange: (mode: TranscriptionMode) => void;
  /** Disable selector (e.g., during transcription) */
  disabled?: boolean;
  /** Show info popover */
  showInfo?: boolean;
}

const STORAGE_KEY = 'mediaforge_transcription_mode';

export function TranscriptionModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
  showInfo = true,
}: TranscriptionModeSelectorProps) {
  const [localMode, setLocalMode] = useState<TranscriptionMode>(selectedMode);

  // Load persisted preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'standard' || stored === 'fast') {
        setLocalMode(stored);
        onModeChange(stored);
      }
    } catch (error) {
      console.warn('[ModeSelector] Failed to load persisted mode:', error);
    }
  }, []);

  // Persist preference when mode changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, localMode);
    } catch (error) {
      console.warn('[ModeSelector] Failed to persist mode:', error);
    }
  }, [localMode]);

  const handleModeChange = (mode: TranscriptionMode) => {
    if (disabled) return;
    setLocalMode(mode);
    onModeChange(mode);
  };

  return (
    <fieldset
      className="mb-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
      disabled={disabled}
    >
      <legend className="px-2 text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-400" />
        Transcription Mode
        {showInfo && (
          <FastModeInfoPopover
            trigger={
              <button
                type="button"
                className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Learn about transcription modes"
              >
                <AlertTriangle className="w-3 h-3" />
              </button>
            }
          />
        )}
      </legend>

      <div className="mt-3 space-y-3">
        {/* Standard Mode */}
        <label
          className={`
            flex items-start cursor-pointer group p-3 rounded-lg border-2 transition-all
            ${localMode === 'standard'
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name="transcription-mode"
            value="standard"
            checked={localMode === 'standard'}
            onChange={() => handleModeChange('standard')}
            disabled={disabled}
            className="mt-1 w-4 h-4 text-blue-600 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            aria-describedby="standard-mode-description"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-zinc-100">Standard Mode</span>
              <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
                Default
              </span>
            </div>
            <p id="standard-mode-description" className="text-xs text-zinc-400 leading-relaxed">
              Multilingual support • Word-level timestamps • Proven accuracy
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                All languages
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Standard speed
              </span>
            </div>
          </div>
        </label>

        {/* Fast Mode */}
        <label
          className={`
            flex items-start cursor-pointer group p-3 rounded-lg border-2 transition-all
            ${localMode === 'fast'
              ? 'border-amber-500 bg-amber-950/20'
              : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name="transcription-mode"
            value="fast"
            checked={localMode === 'fast'}
            onChange={() => handleModeChange('fast')}
            disabled={disabled}
            className="mt-1 w-4 h-4 text-amber-600 border-zinc-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
            aria-describedby="fast-mode-description"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-zinc-100 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Fast Mode
              </span>
              <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                Beta
              </span>
              <span className="text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full font-medium">
                English Only
              </span>
            </div>
            <p id="fast-mode-description" className="text-xs text-zinc-400 leading-relaxed">
              English only • 35-50% faster • Sentence-level timestamps
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1 text-amber-400">
                <Zap className="w-3 h-3" />
                35-50% faster
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <Globe className="w-3 h-3" />
                English only
              </span>
            </div>
          </div>
        </label>
      </div>
    </fieldset>
  );
}
