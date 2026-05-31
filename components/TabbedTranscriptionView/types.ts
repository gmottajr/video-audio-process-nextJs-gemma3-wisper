import type React from 'react';
import type { EnhancementQualityMetrics } from '@/types/quality-metrics';

export type TabType = 'original' | 'enhanced' | 'sidebyside' | 'diff';
export type ExportFormat = 'txt' | 'json' | 'srt' | 'timestamped';

export interface TranscriptionChunk {
  text: string;
  timestamp: [number, number | null];
}

export interface TabMetadata {
  contentType?: string;
  duration?: number;
  modelName?: string;
  filename?: string;
}

export interface TabbedTranscriptionViewProps {
  originalText: string;
  enhancedText: string;
  qualityMetrics?: EnhancementQualityMetrics | null;
  processingTime?: number;
  chunks?: TranscriptionChunk[];
  metadata?: TabMetadata;
  onCopy?: (text: string, tabType: TabType) => void;
  onExport?: (format: ExportFormat, tabType: TabType) => void;
  onReEnhance?: () => void;
  onEnhancedTextChange?: (newText: string) => void;
  className?: string;
}

export interface TabViewContext {
  originalText: string;
  currentEnhancedText: string;
  qualityMetrics?: EnhancementQualityMetrics | null;
  processingTime?: number;
  syncScroll: boolean;
  onSyncScrollChange: (v: boolean) => void;
  isEditing: boolean;
  onTextChange: (text: string) => void;
  hasEdits: boolean;
}

export interface TabStrategy {
  id: TabType;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  View: React.ComponentType<TabViewContext>;
  isEnabled: (ctx: Partial<TabViewContext>) => boolean;
}

export interface ExportPayload {
  text: string;
  activeTab: TabType;
  metadata?: TabMetadata;
  qualityMetrics?: EnhancementQualityMetrics | null;
  hasEdits: boolean;
  chunks?: TranscriptionChunk[];
}

export interface ExportStrategy {
  id: ExportFormat;
  label: string;
  icon: string;
  requiresChunks: boolean;
  serialize: (payload: ExportPayload) => Blob | null;
  filenameFor: (payload: ExportPayload) => string;
}
