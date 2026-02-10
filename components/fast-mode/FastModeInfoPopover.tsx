/**
 * FastModeInfoPopover
 * 
 * Popover component providing detailed information about Fast Mode.
 * Explains trade-offs, use cases, and limitations.
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Zap, Clock, Globe, AlertTriangle, X } from 'lucide-react';

interface FastModeInfoPopoverProps {
  /** Trigger element (button, icon, etc.) */
  trigger?: React.ReactNode;
}

export function FastModeInfoPopover({ trigger }: FastModeInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      {trigger ? (
        // If custom trigger provided, wrap it in a span to avoid button nesting
        <span
          ref={triggerRef as any}
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          aria-label="Learn about Fast Mode"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        // Default trigger is a button
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Learn about Fast Mode"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby="fast-mode-info-title"
          className="absolute z-50 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 animate-in fade-in duration-200"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 id="fast-mode-info-title" className="text-sm font-bold text-zinc-100">
                Fast Mode (Beta)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3 text-xs">
            <p className="text-zinc-300 leading-relaxed">
              Optimized for speed when transcribing English content.
            </p>

            {/* Benefits */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-green-400">35-50% faster</span>
                  <span className="text-zinc-400"> than Standard Mode</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-zinc-300">Uses parallel processing with 2 workers</span>
                </div>
              </div>
            </div>

            {/* Limitations */}
            <div className="pt-2 border-t border-zinc-700 space-y-2">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-red-400">English only</span>
                  <span className="text-zinc-400"> - uses Distil-Whisper model</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-zinc-300">Sentence-level timestamps</span>
                  <span className="text-zinc-500"> (no word-level precision)</span>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div className="pt-2 border-t border-zinc-700">
              <p className="text-zinc-400 mb-1">
                <span className="font-semibold text-zinc-300">Best for:</span> English podcasts, meetings, lectures where speed matters more than word-level precision.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
