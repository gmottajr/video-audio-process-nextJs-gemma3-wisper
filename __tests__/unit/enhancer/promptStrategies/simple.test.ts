import strategy from '@/services/enhancer/promptStrategies/simple';

describe('simple prompt strategy', () => {
  it('has id "simple"', () => {
    expect(strategy.id).toBe('simple');
  });

  it('is always applicable', () => {
    expect(strategy.isApplicable({ useContextAware: false })).toBe(true);
    expect(strategy.isApplicable({ useContextAware: true })).toBe(true);
    expect(strategy.isApplicable({ useContextAware: true, whisperResult: { text: 'x' } })).toBe(true);
  });

  it('build returns all-null result', () => {
    const result = strategy.build({ useContextAware: false });
    expect(result.promptText).toBeNull();
    expect(result.metadata).toBeNull();
    expect(result.enhancementStrategy).toBeNull();
  });
});
