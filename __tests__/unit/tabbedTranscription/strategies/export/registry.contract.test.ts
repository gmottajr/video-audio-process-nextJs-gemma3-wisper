/**
 * @jest-environment jsdom
 */

import { ORDERED_EXPORT_STRATEGIES, getExportStrategy } from '@/components/TabbedTranscriptionView/strategies/export/registry';

describe('Export registry contract', () => {
  test('registers exactly 4 export strategies', () => {
    expect(ORDERED_EXPORT_STRATEGIES).toHaveLength(4);
  });

  test('contains the expected format ids', () => {
    const ids = ORDERED_EXPORT_STRATEGIES.map((s) => s.id);
    expect(ids).toContain('txt');
    expect(ids).toContain('json');
    expect(ids).toContain('srt');
    expect(ids).toContain('timestamped');
  });

  test('all format ids are unique', () => {
    const ids = ORDERED_EXPORT_STRATEGIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each strategy has a non-empty label and icon', () => {
    for (const strategy of ORDERED_EXPORT_STRATEGIES) {
      expect(strategy.label.length).toBeGreaterThan(0);
      expect(strategy.icon.length).toBeGreaterThan(0);
    }
  });

  test('each strategy has serialize and filenameFor functions', () => {
    for (const strategy of ORDERED_EXPORT_STRATEGIES) {
      expect(typeof strategy.serialize).toBe('function');
      expect(typeof strategy.filenameFor).toBe('function');
    }
  });

  test('txt and json do not require chunks', () => {
    expect(getExportStrategy('txt').requiresChunks).toBe(false);
    expect(getExportStrategy('json').requiresChunks).toBe(false);
  });

  test('srt and timestamped require chunks', () => {
    expect(getExportStrategy('srt').requiresChunks).toBe(true);
    expect(getExportStrategy('timestamped').requiresChunks).toBe(true);
  });

  test('getExportStrategy returns correct strategy by id', () => {
    expect(getExportStrategy('txt').id).toBe('txt');
    expect(getExportStrategy('json').id).toBe('json');
    expect(getExportStrategy('srt').id).toBe('srt');
    expect(getExportStrategy('timestamped').id).toBe('timestamped');
  });

  test('getExportStrategy throws for unknown format', () => {
    expect(() => getExportStrategy('pdf' as never)).toThrow();
  });
});
