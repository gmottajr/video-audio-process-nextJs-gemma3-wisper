import type { ExportStrategy, ExportPayload } from '../../types';

export const jsonStrategy: ExportStrategy = {
  id: 'json',
  label: 'JSON (.json)',
  icon: '📋',
  requiresChunks: false,
  serialize: ({ text, metadata, activeTab, hasEdits, qualityMetrics }): Blob => {
    const data = {
      text,
      metadata: {
        ...metadata,
        tab: activeTab,
        edited: hasEdits,
        exportedAt: new Date().toISOString(),
      },
      qualityMetrics: activeTab !== 'original' ? qualityMetrics : undefined,
    };
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  },
  filenameFor: ({ metadata, activeTab, hasEdits }): string => {
    const base = metadata?.filename ?? 'transcript';
    const suffix = activeTab === 'original' ? '-original' : hasEdits ? '-edited' : '-enhanced';
    return `${base}${suffix}.json`;
  },
};
