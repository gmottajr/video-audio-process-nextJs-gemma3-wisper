import { useState, useCallback } from 'react';
import { getExportStrategy } from '../strategies/export/registry';
import type { TabType, ExportFormat, TabMetadata, TranscriptionChunk } from '../types';
import type { EnhancementQualityMetrics } from '@/types/quality-metrics';

interface UseTranscriptExportArgs {
  activeTab: TabType;
  originalText: string;
  currentEnhancedText: string;
  hasEdits: boolean;
  metadata?: TabMetadata;
  qualityMetrics?: EnhancementQualityMetrics | null;
  chunks?: TranscriptionChunk[];
  onExport?: (format: ExportFormat, tabType: TabType) => void;
}

export function useTranscriptExport({
  activeTab,
  originalText,
  currentEnhancedText,
  hasEdits,
  metadata,
  qualityMetrics,
  chunks,
  onExport,
}: UseTranscriptExportArgs) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      setShowExportMenu(false);
      const strategy = getExportStrategy(format);
      const text = activeTab === 'original' ? originalText : currentEnhancedText;
      const blob = strategy.serialize({ text, activeTab, metadata, qualityMetrics, hasEdits, chunks });
      if (!blob) {
        console.warn(`[TabbedTranscriptionView] No data available for ${format} export`);
        return;
      }
      const filename = strategy.filenameFor({ text, activeTab, metadata, qualityMetrics, hasEdits, chunks });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      onExport?.(format, activeTab);
    },
    [activeTab, originalText, currentEnhancedText, hasEdits, metadata, qualityMetrics, chunks, onExport]
  );

  return { showExportMenu, setShowExportMenu, handleExport };
}
