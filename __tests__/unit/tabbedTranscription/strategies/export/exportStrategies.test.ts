/**
 * @jest-environment jsdom
 */

import { txtStrategy } from '@/components/TabbedTranscriptionView/strategies/export/txt';
import { jsonStrategy } from '@/components/TabbedTranscriptionView/strategies/export/json';
import { srtStrategy } from '@/components/TabbedTranscriptionView/strategies/export/srt';
import { timestampedStrategy } from '@/components/TabbedTranscriptionView/strategies/export/timestamped';
import type { ExportPayload } from '@/components/TabbedTranscriptionView/types';

// jsdom does not ship Blob.prototype.text — polyfill via FileReader
if (!(Blob.prototype as { text?: unknown }).text) {
  (Blob.prototype as { text?: unknown }).text = function (this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string));
      reader.addEventListener('error', reject);
      reader.readAsText(this);
    });
  };
}

const BASE_PAYLOAD: ExportPayload = {
  text: 'Hello world.',
  activeTab: 'enhanced',
  hasEdits: false,
  metadata: { filename: 'test' },
};

const CHUNKS = [
  { text: 'Hello world.', timestamp: [0, 2.5] as [number, number | null] },
  { text: 'Goodbye.', timestamp: [2.5, 5.0] as [number, number | null] },
];

// ---- txt ----
describe('txt strategy', () => {
  test('serialize returns a Blob with the text', async () => {
    const blob = txtStrategy.serialize(BASE_PAYLOAD);
    expect(blob).toBeInstanceOf(Blob);
    const content = await (blob as Blob & { text(): Promise<string> }).text();
    expect(content).toBe('Hello world.');
  });

  test('filenameFor enhanced (no edits) uses -enhanced suffix', () => {
    expect(txtStrategy.filenameFor(BASE_PAYLOAD)).toBe('test-enhanced.txt');
  });

  test('filenameFor original uses -original suffix', () => {
    expect(txtStrategy.filenameFor({ ...BASE_PAYLOAD, activeTab: 'original' })).toBe('test-original.txt');
  });

  test('filenameFor edited uses -edited suffix', () => {
    expect(txtStrategy.filenameFor({ ...BASE_PAYLOAD, hasEdits: true })).toBe('test-edited.txt');
  });

  test('filenameFor falls back to "transcript" when no filename', () => {
    expect(txtStrategy.filenameFor({ ...BASE_PAYLOAD, metadata: undefined })).toBe('transcript-enhanced.txt');
  });
});

// ---- json ----
describe('json strategy', () => {
  test('serialize returns valid JSON Blob', async () => {
    const blob = jsonStrategy.serialize(BASE_PAYLOAD);
    expect(blob).toBeInstanceOf(Blob);
    const text = await (blob as Blob & { text(): Promise<string> }).text();
    const json = JSON.parse(text);
    expect(json.text).toBe('Hello world.');
    expect(json.metadata.tab).toBe('enhanced');
    expect(json.metadata.edited).toBe(false);
  });

  test('serialize excludes qualityMetrics for original tab', async () => {
    const payload: ExportPayload = { ...BASE_PAYLOAD, activeTab: 'original' };
    const blob = jsonStrategy.serialize(payload);
    const text = await (blob as Blob & { text(): Promise<string> }).text();
    const json = JSON.parse(text);
    expect(json.qualityMetrics).toBeUndefined();
  });

  test('filenameFor produces .json extension', () => {
    expect(jsonStrategy.filenameFor(BASE_PAYLOAD)).toBe('test-enhanced.json');
  });
});

// ---- srt ----
describe('srt strategy', () => {
  test('serialize returns null when no chunks', () => {
    expect(srtStrategy.serialize(BASE_PAYLOAD)).toBeNull();
    expect(srtStrategy.serialize({ ...BASE_PAYLOAD, chunks: [] })).toBeNull();
  });

  test('serialize returns Blob with valid SRT format', async () => {
    const blob = srtStrategy.serialize({ ...BASE_PAYLOAD, chunks: CHUNKS });
    expect(blob).toBeInstanceOf(Blob);
    const content = await (blob as Blob & { text(): Promise<string> }).text();
    expect(content).toContain('1\n');
    expect(content).toContain(' --> ');
    expect(content).toContain('Hello world.');
    expect(content).toContain('00:00:00,000');
  });

  test('filenameFor produces .srt extension', () => {
    expect(srtStrategy.filenameFor({ ...BASE_PAYLOAD, chunks: CHUNKS })).toBe('test-enhanced.srt');
  });
});

// ---- timestamped ----
describe('timestamped strategy', () => {
  test('serialize returns null when no chunks', () => {
    expect(timestampedStrategy.serialize(BASE_PAYLOAD)).toBeNull();
    expect(timestampedStrategy.serialize({ ...BASE_PAYLOAD, chunks: [] })).toBeNull();
  });

  test('serialize returns Blob with [start → end] format', async () => {
    const blob = timestampedStrategy.serialize({ ...BASE_PAYLOAD, chunks: CHUNKS });
    expect(blob).toBeInstanceOf(Blob);
    const content = await (blob as Blob & { text(): Promise<string> }).text();
    expect(content).toContain('[00:00 → 00:02] Hello world.');
    expect(content).toContain('[00:02 → 00:05] Goodbye.');
  });

  test('filenameFor appends -timestamped suffix', () => {
    expect(timestampedStrategy.filenameFor({ ...BASE_PAYLOAD, chunks: CHUNKS }))
      .toBe('test-enhanced-timestamped.txt');
  });
});
