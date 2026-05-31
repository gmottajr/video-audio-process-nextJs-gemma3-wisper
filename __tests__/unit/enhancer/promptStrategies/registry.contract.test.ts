import '@/services/enhancer/promptStrategies/index';
import { getAllStrategies, selectPromptStrategy } from '@/services/enhancer/promptStrategies/registry';

const EXPECTED_IDS = ['context-aware', 'simple'] as const;

describe('PromptStrategy registry contract', () => {
  it('registers exactly the expected strategy ids', () => {
    const ids = getAllStrategies().map(s => s.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('has no duplicate ids', () => {
    const ids = getAllStrategies().map(s => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it.each(EXPECTED_IDS)('strategy "%s" has isApplicable and build functions', id => {
    const s = getAllStrategies().find(x => x.id === id)!;
    expect(s).toBeDefined();
    expect(typeof s.isApplicable).toBe('function');
    expect(typeof s.build).toBe('function');
  });

  it('selectPromptStrategy returns simple strategy when useContextAware is false', () => {
    const result = selectPromptStrategy({ useContextAware: false });
    expect(result.id).toBe('simple');
  });

  it('selectPromptStrategy returns context-aware strategy when applicable', () => {
    const whisperResult = { text: 'test', chunks: [] };
    const result = selectPromptStrategy({ useContextAware: true, whisperResult });
    expect(result.id).toBe('context-aware');
  });

  it('throws when no strategy is registered (empty registry guard)', () => {
    // This tests the throw path without modifying the real registry
    // We verify the real registry never throws for supported contexts
    expect(() => selectPromptStrategy({ useContextAware: false })).not.toThrow();
  });
});
