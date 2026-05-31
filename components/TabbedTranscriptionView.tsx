"use client";

/**
 * Tabbed Transcription View — REDESIGNED (v2.2)
 *
 * Same exports, same props, same logic, same keyboard shortcuts, same URL hash
 * sync, same SRT export, same edit mode. Only the chrome (header + tab strip +
 * content frame) is restyled to match the design-canvas preview.
 */

import { useState, useCallback, useEffect } from "react";
import {
  FileText, Sparkles, Columns, GitCompare,
  Copy, Check, Download, RefreshCw, ChevronDown,
  Keyboard, Edit3, RotateCcw,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { OriginalTabView } from "@/components/tabs/OriginalTabView";
import { EnhancedTabView } from "@/components/tabs/EnhancedTabView";
import { SideBySideTabView } from "@/components/tabs/SideBySideTabView";
import { DiffTabView } from "@/components/tabs/DiffTabView";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";

// ---------- types (unchanged) ----------
export type TabType = 'original' | 'enhanced' | 'sidebyside' | 'diff';
export type ExportFormat = 'txt' | 'json' | 'srt' | 'timestamped';

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number | null];
}

export interface TabbedTranscriptionViewProps {
  originalText: string;
  enhancedText: string;
  qualityMetrics?: EnhancementQualityMetrics | null;
  processingTime?: number;
  chunks?: TranscriptionChunk[];
  metadata?: {
    contentType?: string;
    duration?: number;
    modelName?: string;
    filename?: string;
  };
  onCopy?: (text: string, tabType: TabType) => void;
  onExport?: (format: ExportFormat, tabType: TabType) => void;
  onReEnhance?: () => void;
  onEnhancedTextChange?: (newText: string) => void;
  className?: string;
}

const TABS: Array<{
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}> = [
  { id: 'original',   label: 'Original',     shortLabel: 'Orig',    icon: <FileText className="w-4 h-4" />,   description: 'Raw transcription from speech recognition' },
  { id: 'enhanced',   label: 'Enhanced',     shortLabel: 'Enh',     icon: <Sparkles className="w-4 h-4" />,   description: 'AI-improved version with filler words removed' },
  { id: 'sidebyside', label: 'Side-by-Side', shortLabel: 'Compare', icon: <Columns className="w-4 h-4" />,    description: 'Compare original and enhanced versions' },
  { id: 'diff',       label: 'Diff View',    shortLabel: 'Diff',    icon: <GitCompare className="w-4 h-4" />, description: 'See exactly what changed with highlights' },
];

// ---------- styles ----------
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
  // ---- state (unchanged) ----
  const [activeTab, setActiveTab] = useState<TabType>('enhanced');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  const currentEnhancedText = editedText ?? enhancedText;
  const hasEdits = editedText !== null && editedText !== enhancedText;

  // ---- URL hash sync (unchanged) ----
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['original', 'enhanced', 'sidebyside', 'diff'].includes(hash)) {
      setActiveTab(hash as TabType);
    } else {
      try {
        const saved = sessionStorage.getItem('mediaforge_active_tab');
        if (saved && ['original', 'enhanced', 'sidebyside', 'diff'].includes(saved)) {
          setActiveTab(saved as TabType);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const newUrl = `${window.location.pathname}${window.location.search}#${activeTab}`;
    window.history.replaceState(null, '', newUrl);
    try {
      sessionStorage.setItem('mediaforge_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['original', 'enhanced', 'sidebyside', 'diff'].includes(hash)) {
        setActiveTab(hash as TabType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    setEditedText(null);
    setIsEditing(false);
  }, [enhancedText]);

  // ---- handlers (unchanged) ----
  const handleCopy = useCallback(async () => {
    let textToCopy: string;
    switch (activeTab) {
      case 'original':   textToCopy = originalText; break;
      case 'enhanced':   textToCopy = currentEnhancedText; break;
      case 'sidebyside': textToCopy = `ORIGINAL:\n${originalText}\n\n─────────────────────────\n\nENHANCED:\n${currentEnhancedText}`; break;
      case 'diff':       textToCopy = currentEnhancedText; break;
      default:           textToCopy = currentEnhancedText;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onCopy?.(textToCopy, activeTab);
    } catch (err) {
      console.error('[TabbedTranscriptionView] Failed to copy:', err);
    }
  }, [activeTab, originalText, currentEnhancedText, onCopy]);

  const formatSRTTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return "00:00:00,000";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  }, []);

  const formatReadableTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return "??:??:??";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const generateTimestampedTXT = useCallback((): string => {
    if (!chunks || chunks.length === 0) return '';
    return chunks
      .filter(c => c.timestamp[0] !== null)
      .map(c => {
        const start = formatReadableTime(c.timestamp[0]);
        const end   = formatReadableTime(c.timestamp[1]);
        return `[${start} → ${end}] ${c.text.trim()}`;
      })
      .join("\n");
  }, [chunks, formatReadableTime]);

  const generateSRT = useCallback((): string => {
    if (!chunks || chunks.length === 0) return '';
    let srt = '';
    chunks.forEach((chunk, index) => {
      const [start, end] = chunk.timestamp;
      if (start !== null) {
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(start)} --> ${formatSRTTime(end ?? start + 5)}\n`;
        srt += `${chunk.text.trim()}\n\n`;
      }
    });
    return srt;
  }, [chunks, formatSRTTime]);

  const handleExport = useCallback((format: ExportFormat) => {
    setShowExportMenu(false);
    const textToExport = activeTab === 'original' ? originalText : currentEnhancedText;
    const suffix = activeTab === 'original' ? '-original' : (hasEdits ? '-edited' : '-enhanced');
    const filename = metadata?.filename || 'transcript';

    let blob: Blob;
    let extension: string;
    switch (format) {
      case 'txt':
        blob = new Blob([textToExport], { type: 'text/plain' });
        extension = 'txt';
        break;
      case 'json':
        const jsonData = {
          text: textToExport,
          metadata: { ...metadata, tab: activeTab, edited: hasEdits, exportedAt: new Date().toISOString() },
          qualityMetrics: activeTab !== 'original' ? qualityMetrics : undefined,
        };
        blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        extension = 'json';
        break;
      case 'srt':
        const srtContent = generateSRT();
        if (!srtContent) {
          console.warn('[TabbedTranscriptionView] No chunks available for SRT export');
          return;
        }
        blob = new Blob([srtContent], { type: 'text/plain' });
        extension = 'srt';
        break;
      case 'timestamped':
        const tsContent = generateTimestampedTXT();
        if (!tsContent) {
          console.warn('[TabbedTranscriptionView] No chunks available for timestamped export');
          return;
        }
        blob = new Blob([tsContent], { type: 'text/plain' });
        extension = 'txt';
        break;
      default:
        blob = new Blob([textToExport], { type: 'text/plain' });
        extension = 'txt';
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${suffix}${format === 'timestamped' ? '-timestamped' : ''}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    onExport?.(format, activeTab);
  }, [activeTab, originalText, currentEnhancedText, hasEdits, metadata, qualityMetrics, onExport, generateSRT, generateTimestampedTXT]);

  const handleTextEdit = useCallback((newText: string) => {
    setEditedText(newText);
    onEnhancedTextChange?.(newText);
  }, [onEnhancedTextChange]);

  const handleResetEdits = useCallback(() => {
    setEditedText(null);
    setIsEditing(false);
  }, []);

  // ---- keyboard shortcuts (unchanged) ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (TABS[tabIndex]) setActiveTab(TABS[tabIndex].id);
        return;
      }
      if (ctrlKey && e.key === 'e') {
        e.preventDefault();
        setActiveTab(prev => prev === 'original' ? 'enhanced' : 'original');
        return;
      }
      if (ctrlKey && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (e.key === '?' && !ctrlKey) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]);

  // ---- render ----
  return (
    <div
      className={cn("rounded-2xl overflow-hidden", className)}
      style={{
        background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#f3f3f8",
      }}
    >
      {/* HEADER */}
      <div
        className="px-5 py-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background:
            "radial-gradient(80% 100% at 0% 0%, rgba(139,92,246,0.08), transparent 70%)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                color: "#a78bfa",
                display: "grid",
                placeItems: "center",
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
                  color: "#f3f3f8",
                  lineHeight: 1.2,
                }}
              >
                AI Transcription
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10.5,
                  color: "#5b5b6e",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                {metadata?.modelName && `${metadata.modelName} · `}
                {metadata?.duration && `${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')} · `}
                {qualityMetrics && `quality ${qualityMetrics.qualityScore}/100`}
              </div>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex items-center gap-1.5">
            {activeTab === 'enhanced' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                title={isEditing ? "Exit edit mode" : "Edit enhanced text"}
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  padding: "7px 11px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: isEditing ? "#f59e0b" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isEditing ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: isEditing ? "#0d0d18" : "#f3f3f8",
                  cursor: "pointer",
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
              </button>
            )}

            {hasEdits && (
              <button
                onClick={handleResetEdits}
                title="Reset to AI-generated text"
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  padding: "7px 11px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#fbbf24",
                  cursor: "pointer",
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              title={`Copy ${activeTab} text (Ctrl+C)`}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                padding: "7px 11px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: copySuccess ? "#34d399" : "#f3f3f8",
                cursor: "pointer",
              }}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copySuccess ? "Copied!" : "Copy"}</span>
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
                style={{
                  padding: "7px 11px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "linear-gradient(180deg, #8b5cf6, #6d28d9)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div
                    className="absolute right-0 mt-2 z-20 overflow-hidden"
                    style={{
                      width: 192,
                      background: "#14141f",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    {[
                      { f: "txt" as ExportFormat,  icon: "📄", label: "Plain Text (.txt)" },
                      { f: "json" as ExportFormat, icon: "📋", label: "JSON (.json)" },
                    ].map(({ f, icon, label }) => (
                      <button
                        key={f}
                        onClick={() => handleExport(f)}
                        className="w-full text-left flex items-center gap-2 transition-colors hover:bg-white/5"
                        style={{ padding: "10px 14px", fontSize: 13, color: "#f3f3f8" }}
                      >
                        <span>{icon}</span> {label}
                      </button>
                    ))}
                    {chunks && chunks.length > 0 && (
                      <>
                        <button
                          onClick={() => handleExport('timestamped')}
                          className="w-full text-left flex items-center gap-2 transition-colors hover:bg-white/5"
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            color: "#f3f3f8",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span>🕐</span> Timestamped Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExport('srt')}
                          className="w-full text-left flex items-center gap-2 transition-colors hover:bg-white/5"
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            color: "#f3f3f8",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span>🎬</span> Subtitles (.srt)
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {onReEnhance && (
              <button
                onClick={onReEnhance}
                title="Re-enhance transcript"
                className="flex items-center gap-1.5 transition-colors"
                style={{
                  padding: "7px 11px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#c4b5fd",
                  cursor: "pointer",
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-enhance</span>
              </button>
            )}

            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              title="Keyboard shortcuts (?)"
              style={{
                padding: 7,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8a8a9c",
                cursor: "pointer",
              }}
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TAB STRIP */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,8,15,0.4)",
        }}
      >
        <div className="flex overflow-x-auto" role="tablist" aria-label="Transcription view options">
          {TABS.map((tab, index) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 transition-all whitespace-nowrap"
                style={{
                  padding: "14px 18px",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  borderBottom: active ? "2px solid #8b5cf6" : "2px solid transparent",
                  marginBottom: -1,
                  color: active ? "#f3f3f8" : "#8a8a9c",
                  background: active ? "rgba(139,92,246,0.06)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: active ? "#a78bfa" : "#5b5b6e" }}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.id === 'enhanced' && qualityMetrics && !hasEdits && (
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "rgba(16,185,129,0.15)",
                      color: "#34d399",
                      letterSpacing: "0.06em",
                    }}
                  >
                    ✓
                  </span>
                )}
                {tab.id === 'enhanced' && hasEdits && (
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "rgba(245,158,11,0.15)",
                      color: "#fbbf24",
                    }}
                  >
                    edited
                  </span>
                )}
                <span
                  className="hidden lg:inline"
                  style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#5b5b6e", marginLeft: 4 }}
                >
                  ({index + 1})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="p-6">
        {activeTab === 'original' && (
          <div role="tabpanel" id="original-panel" aria-labelledby="original-tab">
            <OriginalTabView text={originalText} readabilityScore={qualityMetrics?.readabilityBefore} />
          </div>
        )}
        {activeTab === 'enhanced' && (
          <div role="tabpanel" id="enhanced-panel" aria-labelledby="enhanced-tab">
            <EnhancedTabView
              text={currentEnhancedText}
              qualityMetrics={qualityMetrics}
              readabilityScore={qualityMetrics?.readabilityAfter}
              processingTime={processingTime}
              isEditable={isEditing}
              onTextChange={handleTextEdit}
              hasEdits={hasEdits}
            />
          </div>
        )}
        {activeTab === 'sidebyside' && (
          <div role="tabpanel" id="sidebyside-panel" aria-labelledby="sidebyside-tab">
            <SideBySideTabView
              originalText={originalText}
              enhancedText={currentEnhancedText}
              qualityMetrics={qualityMetrics}
              syncScroll={syncScroll}
              onSyncScrollChange={setSyncScroll}
            />
          </div>
        )}
        {activeTab === 'diff' && (
          <div role="tabpanel" id="diff-panel" aria-labelledby="diff-tab">
            <DiffTabView originalText={originalText} enhancedText={currentEnhancedText} />
          </div>
        )}
      </div>

      {/* KEYBOARD HELP MODAL */}
      {showKeyboardHelp && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowKeyboardHelp(false)} />
          <div
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md"
            style={{
              transform: "translate(-50%, -50%)",
              background: "#14141f",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="flex items-center gap-2 mb-4"
              style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}
            >
              <Keyboard className="w-5 h-5" style={{ color: "#a78bfa" }} />
              Keyboard Shortcuts
            </div>
            <table className="w-full text-sm">
              <tbody style={{ color: "#8a8a9c" }}>
                {[
                  [["Ctrl", "1–4"], "Switch to tab"],
                  [["Ctrl", "E"], "Toggle Original/Enhanced"],
                  [["Ctrl", "C"], "Copy current tab"],
                  [["?"], "Show/hide shortcuts"],
                  [["Esc"], "Close dialogs"],
                ].map(([keys, label], i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <td className="py-2" style={{ width: 140 }}>
                      {(keys as string[]).map((k, j) => (
                        <span key={k}>
                          <kbd
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "#f3f3f8",
                            }}
                          >
                            {k}
                          </kbd>
                          {j < (keys as string[]).length - 1 && <span className="mx-1">+</span>}
                        </span>
                      ))}
                    </td>
                    <td className="py-2">{label as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="mt-5 w-full transition-transform hover:scale-[1.01]"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "linear-gradient(180deg, #8b5cf6, #6d28d9)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TabbedTranscriptionView;
