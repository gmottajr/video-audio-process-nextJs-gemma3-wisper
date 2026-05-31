import type { ExportStrategy, ExportPayload, TranscriptionChunk } from '../../types';

function formatReadableTime(seconds: number | null): string {
  if (seconds === null) return '??:??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildTimestampedTXT(chunks: TranscriptionChunk[]): string {
  return chunks
    .filter((c) => c.timestamp[0] !== null)
    .map((c) => {
      const start = formatReadableTime(c.timestamp[0]);
      const end = formatReadableTime(c.timestamp[1]);
      return `[${start} → ${end}] ${c.text.trim()}`;
    })
    .join('\n');
}

export const timestampedStrategy: ExportStrategy = {
  id: 'timestamped',
  label: 'Timestamped Text (.txt)',
  icon: '🕐',
  requiresChunks: true,
  serialize: ({ chunks }): Blob | null => {
    if (!chunks?.length) return null;
    const content = buildTimestampedTXT(chunks);
    if (!content) return null;
    return new Blob([content], { type: 'text/plain' });
  },
  filenameFor: ({ metadata, activeTab, hasEdits }): string => {
    const base = metadata?.filename ?? 'transcript';
    const suffix = activeTab === 'original' ? '-original' : hasEdits ? '-edited' : '-enhanced';
    return `${base}${suffix}-timestamped.txt`;
  },
};
