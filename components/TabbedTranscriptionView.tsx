"use client";

/**
 * Tabbed Transcription View
 * 
 * Main container component that manages tab state and renders the appropriate
 * view based on the active tab. Provides Original, Enhanced, Side-by-Side,
 * and Diff views for comprehensive transcript comparison.
 * 
 * Phase 4 implementation.
 * Phase 4.5: Added SRT export, URL hash sync, editable text, synchronized scrolling.
 */

import { useState, useCallback, useEffect } from "react";
import { 
  FileText, 
  Sparkles, 
  Columns, 
  GitCompare,
  Copy,
  Check,
  Download,
  RefreshCw,
  ChevronDown,
  Keyboard,
  Edit3,
  RotateCcw,
  TrendingUp
} from "lucide-react";
import { cn } from "@/utils/cn";
import { OriginalTabView } from "@/components/tabs/OriginalTabView";
import { EnhancedTabView } from "@/components/tabs/EnhancedTabView";
import { SideBySideTabView } from "@/components/tabs/SideBySideTabView";
import { DiffTabView } from "@/components/tabs/DiffTabView";
import { AnalysisTabView } from "@/components/tabs/AnalysisTabView";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";
import type { TranscriptAnalysis } from "@/types/transcript-analysis";

// ============================================================================
// TYPES
// ============================================================================

export type TabType = 'original' | 'enhanced' | 'sidebyside' | 'diff' | 'analysis';

export type ExportFormat = 'txt' | 'json' | 'srt';

/** Chunk with timestamp for SRT export */
export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number | null];
}

export interface TabbedTranscriptionViewProps {
  /** Raw transcription from Whisper */
  originalText: string;
  /** AI-enhanced version */
  enhancedText: string;
  /** Quality metrics from Phase 3 */
  qualityMetrics?: EnhancementQualityMetrics | null;
  /** Enhancement processing time in seconds */
  processingTime?: number;
  /** Original chunks with timestamps for SRT export */
  chunks?: TranscriptionChunk[];
  /** Metadata about the content */
  metadata?: {
    contentType?: string;
    duration?: number;
    modelName?: string;
    filename?: string;
  };
  /** AI Analysis results */
  analysis?: TranscriptAnalysis | null;
  /** Is analysis currently running */
  isAnalyzing?: boolean;
  /** Analysis error message */
  analysisError?: string | null;
  /** Action callbacks */
  onCopy?: (text: string, tabType: TabType) => void;
  onExport?: (format: ExportFormat, tabType: TabType) => void;
  onReEnhance?: () => void;
  /** Called when user edits the enhanced text */
  onEnhancedTextChange?: (newText: string) => void;
  /** Called when user requests analysis retry */
  onAnalysisRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

const TABS: Array<{
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    id: 'original',
    label: 'Original',
    shortLabel: 'Orig',
    icon: <FileText className="w-4 h-4" />,
    description: 'Raw transcription from speech recognition',
  },
  {
    id: 'enhanced',
    label: 'Enhanced',
    shortLabel: 'Enh',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'AI-improved version with filler words removed',
  },
  {
    id: 'sidebyside',
    label: 'Side-by-Side',
    shortLabel: 'Compare',
    icon: <Columns className="w-4 h-4" />,
    description: 'Compare original and enhanced versions',
  },
  {
    id: 'diff',
    label: 'Diff View',
    shortLabel: 'Diff',
    icon: <GitCompare className="w-4 h-4" />,
    description: 'See exactly what changed with highlights',
  },
  {
    id: 'analysis',
    label: 'AI Analysis',
    shortLabel: 'Analysis',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Deep insights and structured analysis of the transcript',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TabbedTranscriptionView({
  originalText,
  enhancedText,
  qualityMetrics,
  processingTime,
  chunks,
  metadata,
  analysis,
  isAnalyzing,
  analysisError,
  onCopy,
  onExport,
  onReEnhance,
  onEnhancedTextChange,
  onAnalysisRetry,
  className,
}: TabbedTranscriptionViewProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('enhanced');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Phase 4.5: Editable enhanced text
  const [editedText, setEditedText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Phase 4.5: Synchronized scrolling for side-by-side
  const [syncScroll, setSyncScroll] = useState(true);
  
  // Get the current enhanced text (edited or original)
  const currentEnhancedText = editedText ?? enhancedText;
  const hasEdits = editedText !== null && editedText !== enhancedText;
  
  // Phase 4.5: URL Hash Sync - Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove #
    if (hash && ['original', 'enhanced', 'sidebyside', 'diff', 'analysis'].includes(hash)) {
      setActiveTab(hash as TabType);
    } else {
      // Fall back to session storage
      try {
        const saved = sessionStorage.getItem('mediaforge_active_tab');
        if (saved && ['original', 'enhanced', 'sidebyside', 'diff', 'analysis'].includes(saved)) {
          setActiveTab(saved as TabType);
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, []);
  
  // Phase 4.5: URL Hash Sync - Update hash when tab changes
  useEffect(() => {
    // Update URL hash without triggering navigation
    const newUrl = `${window.location.pathname}${window.location.search}#${activeTab}`;
    window.history.replaceState(null, '', newUrl);
    
    // Also save to session storage as backup
    try {
      sessionStorage.setItem('mediaforge_active_tab', activeTab);
    } catch {
      // Ignore storage errors
    }
  }, [activeTab]);
  
  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['original', 'enhanced', 'sidebyside', 'diff', 'analysis'].includes(hash)) {
        setActiveTab(hash as TabType);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Reset edited text when enhancedText prop changes (new enhancement)
  useEffect(() => {
    setEditedText(null);
    setIsEditing(false);
  }, [enhancedText]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCopy = useCallback(async () => {
    let textToCopy: string;
    
    switch (activeTab) {
      case 'original':
        textToCopy = originalText;
        break;
      case 'enhanced':
        textToCopy = currentEnhancedText;
        break;
      case 'sidebyside':
        textToCopy = `ORIGINAL:\n${originalText}\n\n─────────────────────────\n\nENHANCED:\n${currentEnhancedText}`;
        break;
      case 'diff':
        // For diff, copy the enhanced version
        textToCopy = currentEnhancedText;
        break;
      default:
        textToCopy = currentEnhancedText;
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

  // Phase 4.5: Format timestamp for SRT
  const formatSRTTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return "00:00:00,000";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  }, []);

  // Phase 4.5: Generate SRT content from chunks
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
          metadata: {
            ...metadata,
            tab: activeTab,
            edited: hasEdits,
            exportedAt: new Date().toISOString(),
          },
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
      default:
        blob = new Blob([textToExport], { type: 'text/plain' });
        extension = 'txt';
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}${suffix}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    
    onExport?.(format, activeTab);
  }, [activeTab, originalText, currentEnhancedText, hasEdits, metadata, qualityMetrics, onExport, generateSRT]);

  // Phase 4.5: Handle text edit
  const handleTextEdit = useCallback((newText: string) => {
    setEditedText(newText);
    onEnhancedTextChange?.(newText);
  }, [onEnhancedTextChange]);

  // Phase 4.5: Reset edits to original enhanced text
  const handleResetEdits = useCallback(() => {
    setEditedText(null);
    setIsEditing(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Ctrl/Cmd + 1-4 to switch tabs
      if (ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (TABS[tabIndex]) {
          setActiveTab(TABS[tabIndex].id);
        }
        return;
      }
      
      // Ctrl/Cmd + E to toggle between original and enhanced
      if (ctrlKey && e.key === 'e') {
        e.preventDefault();
        setActiveTab(prev => prev === 'original' ? 'enhanced' : 'original');
        return;
      }
      
      // Ctrl/Cmd + C to copy (only if no text selected)
      if (ctrlKey && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopy();
        return;
      }
      
      // ? to show keyboard help
      if (e.key === '?' && !ctrlKey) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowExportMenu(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-purple-950/30 to-pink-950/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Transcription Result</h2>
              <p className="text-xs text-zinc-400">
                {metadata?.modelName && `Model: ${metadata.modelName} • `}
                {metadata?.duration && `Duration: ${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')} • `}
                {qualityMetrics && `Quality: ${qualityMetrics.qualityScore}/100`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Phase 4.5: Edit Toggle (only on Enhanced tab) */}
            {activeTab === 'enhanced' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  isEditing 
                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                    : "bg-zinc-800 hover:bg-zinc-700"
                )}
                title={isEditing ? "Exit edit mode" : "Edit enhanced text"}
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
              </button>
            )}
            
            {/* Phase 4.5: Reset Edits Button (only when there are edits) */}
            {hasEdits && (
              <button
                onClick={handleResetEdits}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Reset to AI-generated text"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title={`Copy ${activeTab} text (Ctrl+C)`}
            >
              {copySuccess ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                    >
                      <span>📄</span> Plain Text (.txt)
                    </button>
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                    >
                      <span>📋</span> JSON (.json)
                    </button>
                    {/* Phase 4.5: SRT Export (only when chunks available) */}
                    {chunks && chunks.length > 0 && (
                      <button
                        onClick={() => handleExport('srt')}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 transition-colors border-t border-zinc-700"
                      >
                        <span>🎬</span> Subtitles (.srt)
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Re-enhance Button */}
            {onReEnhance && (
              <button
                onClick={onReEnhance}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Re-enhance transcript"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Re-enhance</span>
              </button>
            )}

            {/* Keyboard Help */}
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex overflow-x-auto" role="tablist" aria-label="Transcription view options">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap",
                "border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-purple-500 text-purple-400 bg-purple-950/20"
                  : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {tab.id === 'enhanced' && qualityMetrics && !hasEdits && (
                <span className="ml-1 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                  ✓
                </span>
              )}
              {tab.id === 'enhanced' && hasEdits && (
                <span className="ml-1 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  edited
                </span>
              )}
              <span className="hidden lg:inline text-xs text-zinc-500 ml-1">
                ({index + 1})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'original' && (
          <div
            role="tabpanel"
            id="original-panel"
            aria-labelledby="original-tab"
          >
            <OriginalTabView
              text={originalText}
              readabilityScore={qualityMetrics?.readabilityBefore}
            />
          </div>
        )}
        
        {activeTab === 'enhanced' && (
          <div
            role="tabpanel"
            id="enhanced-panel"
            aria-labelledby="enhanced-tab"
          >
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
          <div
            role="tabpanel"
            id="sidebyside-panel"
            aria-labelledby="sidebyside-tab"
          >
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
          <div
            role="tabpanel"
            id="diff-panel"
            aria-labelledby="diff-tab"
          >
            <DiffTabView
              originalText={originalText}
              enhancedText={currentEnhancedText}
            />
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div
            role="tabpanel"
            id="analysis-panel"
            aria-labelledby="analysis-tab"
          >
            <AnalysisTabView
              analysis={analysis}
              isLoading={isAnalyzing}
              error={analysisError}
              onRetry={onAnalysisRetry}
            />
          </div>
        )}
      </div>

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowKeyboardHelp(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Ctrl</kbd>
                    <span className="mx-1">+</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">1-5</kbd>
                  </td>
                  <td className="py-2 text-zinc-400">Switch to tab</td>
                </tr>
                <tr>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Ctrl</kbd>
                    <span className="mx-1">+</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">E</kbd>
                  </td>
                  <td className="py-2 text-zinc-400">Toggle Original/Enhanced</td>
                </tr>
                <tr>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Ctrl</kbd>
                    <span className="mx-1">+</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">C</kbd>
                  </td>
                  <td className="py-2 text-zinc-400">Copy current tab</td>
                </tr>
                <tr>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">?</kbd>
                  </td>
                  <td className="py-2 text-zinc-400">Show/hide shortcuts</td>
                </tr>
                <tr>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Esc</kbd>
                  </td>
                  <td className="py-2 text-zinc-400">Close dialogs</td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
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

