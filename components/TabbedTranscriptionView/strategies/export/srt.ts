import type { ExportStrategy, ExportPayload, TranscriptionChunk } from '../../types';

function formatSRTTime(seconds: number | null): string {
  if (seconds === null) return '00:00:00,000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function buildSRT(chunks: TranscriptionChunk[]): string {
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
}

export const srtStrategy: ExportStrategy = {
  id: 'srt',
  label: 'Subtitles (.srt)',
  icon: '🎬',
  requiresChunks: true,
  serialize: ({ chunks }): Blob | null => {
    if (!chunks?.length) return null;
    const content = buildSRT(chunks);
    if (!content) return null;
    return new Blob([content], { type: 'text/plain' });
  },
  filenameFor: ({ metadata, activeTab, hasEdits }): string => {
    const base = metadata?.filename ?? 'transcript';
    const suffix = activeTab === 'original' ? '-original' : hasEdits ? '-edited' : '-enhanced';
    return `${base}${suffix}.srt`;
  },
};
