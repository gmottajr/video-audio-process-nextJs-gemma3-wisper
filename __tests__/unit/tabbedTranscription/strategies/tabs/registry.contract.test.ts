/**
 * @jest-environment jsdom
 */

// Lucide exports forwardRef objects (typeof === 'object'), so mock them as plain functions
jest.mock('lucide-react', () => ({
  FileText: () => null,
  Sparkles: () => null,
  Columns: () => null,
  GitCompare: () => null,
}));

import { ORDERED_TABS, TAB_REGISTRY, getTabStrategy, isValidTabId } from '@/components/TabbedTranscriptionView/strategies/tabs/registry';

describe('Tab registry contract', () => {
  test('registers exactly 4 tab strategies', () => {
    expect(ORDERED_TABS).toHaveLength(4);
    expect(TAB_REGISTRY.size).toBe(4);
  });

  test('contains the expected tab ids in order', () => {
    expect(ORDERED_TABS.map((t) => t.id)).toEqual(['original', 'enhanced', 'sidebyside', 'diff']);
  });

  test('all tab ids are unique', () => {
    const ids = ORDERED_TABS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('each strategy has a defined View component', () => {
    for (const strategy of ORDERED_TABS) {
      expect(strategy.View).toBeDefined();
      expect(typeof strategy.View).toBe('function');
    }
  });

  test('each strategy has a defined Icon component', () => {
    for (const strategy of ORDERED_TABS) {
      expect(strategy.Icon).toBeDefined();
      expect(typeof strategy.Icon).toBe('function');
    }
  });

  test('each strategy has non-empty label and shortLabel', () => {
    for (const strategy of ORDERED_TABS) {
      expect(strategy.label.length).toBeGreaterThan(0);
      expect(strategy.shortLabel.length).toBeGreaterThan(0);
    }
  });

  test('getTabStrategy returns correct strategy', () => {
    const original = getTabStrategy('original');
    expect(original.id).toBe('original');
    expect(original.label).toBe('Original');

    const enhanced = getTabStrategy('enhanced');
    expect(enhanced.id).toBe('enhanced');

    const sbs = getTabStrategy('sidebyside');
    expect(sbs.id).toBe('sidebyside');

    const diff = getTabStrategy('diff');
    expect(diff.id).toBe('diff');
  });

  test('getTabStrategy throws for unknown id', () => {
    expect(() => getTabStrategy('unknown' as never)).toThrow();
  });

  test('isValidTabId accepts all registered ids', () => {
    for (const strategy of ORDERED_TABS) {
      expect(isValidTabId(strategy.id)).toBe(true);
    }
  });

  test('isValidTabId rejects unknown id', () => {
    expect(isValidTabId('unknown')).toBe(false);
    expect(isValidTabId('')).toBe(false);
  });
});
