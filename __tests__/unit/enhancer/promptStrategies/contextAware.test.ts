import strategy from '@/services/enhancer/promptStrategies/contextAware';

jest.mock('@/utils/whisperMetadataExtractor', () => ({
  extractWhisperMetadata: jest.fn(() => ({
    contentType: 'business',
    contentTypeConfidence: 'high',
    fillerDensity: 0.05,
    fillerWordPercentage: 5,
    wordsPerMinute: 140,
    speakingRateCategory: 'normal',
    speakerCount: 1,
    keywords: { topKeywords: [] },
    segments: [],
  })),
}));

jest.mock('@/utils/enhancementStrategyGenerator', () => ({
  generateEnhancementStrategy: jest.fn(() => ({
    fillerRemoval: 'aggressive',
    grammarCorrection: 'moderate',
    targetFormality: 'professional',
  })),
}));

jest.mock('@/utils/contextAwarePromptBuilder', () => ({
  buildContextAwarePrompt: jest.fn(() => 'mocked context-aware prompt'),
}));

describe('context-aware prompt strategy', () => {
  it('has id "context-aware"', () => {
    expect(strategy.id).toBe('context-aware');
  });

  it('is not applicable when useContextAware is false', () => {
    expect(strategy.isApplicable({ useContextAware: false, whisperResult: { text: 'x' } })).toBe(false);
  });

  it('is not applicable when whisperResult is missing', () => {
    expect(strategy.isApplicable({ useContextAware: true })).toBe(false);
  });

  it('is applicable when useContextAware=true and whisperResult provided', () => {
    expect(strategy.isApplicable({ useContextAware: true, whisperResult: { text: 'x' } })).toBe(true);
  });

  it('build returns promptText and metadata when applicable', () => {
    const result = strategy.build({ useContextAware: true, whisperResult: { text: 'x' } });
    expect(result.promptText).toBe('mocked context-aware prompt');
    expect(result.metadata).toBeDefined();
    expect(result.enhancementStrategy).toBeDefined();
  });

  it('build returns null result when whisperResult is absent', () => {
    const result = strategy.build({ useContextAware: true });
    expect(result.promptText).toBeNull();
    expect(result.metadata).toBeNull();
  });

  it('build returns null result when metadata extraction throws', () => {
    const { extractWhisperMetadata } = require('@/utils/whisperMetadataExtractor');
    extractWhisperMetadata.mockImplementationOnce(() => { throw new Error('fail'); });
    const result = strategy.build({ useContextAware: true, whisperResult: { text: 'x' } });
    expect(result.promptText).toBeNull();
  });
});
