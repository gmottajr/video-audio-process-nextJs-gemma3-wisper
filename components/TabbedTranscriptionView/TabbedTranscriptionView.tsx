"use client";

import React, { useState } from 'react';
import { FileText, Copy, Check, RefreshCw, Keyboard } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ORDERED_TABS, TAB_REGISTRY } from './strategies/tabs/registry';
import { TabStrip } from './components/TabStrip';
import { ExportMenu } from './components/ExportMenu';
import { KeyboardHelpModal } from './components/KeyboardHelpModal';
import { EditModeBar } from './components/EditModeBar';
import { useEditableEnhancedText } from './hooks/useEditableEnhancedText';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { useTranscriptExport } from './hooks/useTranscriptExport';
import { useUrlHashSync } from './hooks/useUrlHashSync';
import { useTabKeyboardShortcuts } from './hooks/useTabKeyboardShortcuts';
import type { TabbedTranscriptionViewProps, TabType, TabViewContext } from './types';

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

export function TabbedTranscriptionView({
  originalText,
  enhancedText,
  qualityMetrics,
  processingTime,
  chunks,
  metadata,
  onCopy,
  onExport,
  onReEnhance,
  onEnhancedTextChange,
  className,
}: TabbedTranscriptionViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('enhanced');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  const { currentEnhancedText, hasEdits, isEditing, setIsEditing, handleTextEdit, handleResetEdits } =
    useEditableEnhancedText(enhancedText, onEnhancedTextChange);

  const { copySuccess, handleCopy } = useCopyToClipboard({
    activeTab,
    originalText,
    currentEnhancedText,
    onCopy,
  });

  const { showExportMenu, setShowExportMenu, handleExport } = useTranscriptExport({
    activeTab,
    originalText,
    currentEnhancedText,
    hasEdits,
    metadata,
    qualityMetrics,
    chunks,
    onExport,
  });

  useUrlHashSync(activeTab, setActiveTab);

  useTabKeyboardShortcuts({
    tabs: ORDERED_TABS,
    setActiveTab,
    handleCopy,
    setShowKeyboardHelp,
    setShowExportMenu,
  });

  const tabCtx: TabViewContext = {
    originalText,
    currentEnhancedText,
    qualityMetrics,
    processingTime,
    syncScroll,
    onSyncScrollChange: setSyncScroll,
    isEditing,
    onTextChange: handleTextEdit,
    hasEdits,
  };

  const activeStrategy = TAB_REGISTRY.get(activeTab);

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{
        background: 'linear-gradient(180deg, #14141f 0%, #0d0d18 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#f3f3f8',
      }}
    >
      {/* HEADER */}
      <div
        className="px-5 py-4"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'radial-gradient(80% 100% at 0% 0%, rgba(139,92,246,0.08), transparent 70%)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: icon + title + subtitle */}
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#a78bfa',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#f3f3f8',
                  lineHeight: 1.2,
                }}
              >
                AI Transcription
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10.5,
                  color: '#5b5b6e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {metadata?.modelName && `${metadata.modelName} · `}
                {metadata?.duration &&
                  `${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')} · `}
                {qualityMetrics && `quality ${qualityMetrics.qualityScore}/100`}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1.5">
            <EditModeBar
              activeTab={activeTab}
              isEditing={isEditing}
              hasEdits={hasEdits}
              onToggleEdit={() => setIsEditing((prev) => !prev)}
              onResetEdits={handleResetEdits}
            />

            <button
              onClick={handleCopy}
              title={`Copy ${activeTab} text (Ctrl+C)`}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: copySuccess ? '#34d399' : '#f3f3f8',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>

            <ExportMenu
              showExportMenu={showExportMenu}
              onToggle={() => setShowExportMenu((prev) => !prev)}
              onExport={handleExport}
              onClose={() => setShowExportMenu(false)}
              hasChunks={!!(chunks?.length)}
            />

            {onReEnhance && (
              <button
                onClick={onReEnhance}
                title="Re-enhance transcript"
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  padding: '7px 11px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#c4b5fd',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-enhance</span>
              </button>
            )}

            <button
              onClick={() => setShowKeyboardHelp((prev) => !prev)}
              title="Keyboard shortcuts (?)"
              style={{
                padding: 7,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#8a8a9c',
                cursor: 'pointer',
              }}
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <TabStrip
        tabs={ORDERED_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        qualityMetrics={qualityMetrics}
        hasEdits={hasEdits}
      />

      <div className="p-6">
        {activeStrategy && (
          <div role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
            <activeStrategy.View {...tabCtx} />
          </div>
        )}
      </div>

      <KeyboardHelpModal show={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  );
}

export default TabbedTranscriptionView;
