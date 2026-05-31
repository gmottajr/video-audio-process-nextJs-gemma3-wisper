import type { ExportStrategy, ExportPayload } from '../../types';

export const txtStrategy: ExportStrategy = {
  id: 'txt',
  label: 'Plain Text (.txt)',
  icon: '📄',
  requiresChunks: false,
  serialize: ({ text }): Blob => new Blob([text], { type: 'text/plain' }),
  filenameFor: ({ metadata, activeTab, hasEdits }): string => {
    const base = metadata?.filename ?? 'transcript';
    const suffix = activeTab === 'original' ? '-original' : hasEdits ? '-edited' : '-enhanced';
    return `${base}${suffix}.txt`;
  },
};
