import { runEnhancementPipeline } from '@/services/enhancer/enhancementPipeline';

jest.mock('@/utils/transcriptChunker', () => ({
  getChunkingInfo: jest.fn(),
  chunkTranscript: jest.fn(),
  mergeChunks: jest.fn((chunks: string[]) => chunks.join(' ')),
}));

const { getChunkingInfo, chunkTranscript } = require('@/utils/transcriptChunker');

const mockWorker = {
  sendRequest: jest.fn(),
} as any;

const SINGLE_RESULT = {
  originalText: 'hello',
  enhancedText: 'Hello.',
  improvements: { fillerWordsRemoved: [], fillerCount: 0, grammarFixes: 1, originalWordCount: 1, enhancedWordCount: 1, originalCharCount: 5, enhancedCharCount: 6, compressionRatio: 1.2, reductionPercentage: 0 },
  processingTime: 1,
  tokensGenerated: 10,
  modelUsed: 'test-model',
  timestamp: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

describe('runEnhancementPipeline', () => {
  describe('single request path', () => {
    beforeEach(() => {
      getChunkingInfo.mockReturnValue({ needsChunking: false, estimatedChunks: 1 });
      mockWorker.sendRequest.mockResolvedValue(SINGLE_RESULT);
    });

    it('calls worker enhance with transcript', async () => {
      await runEnhancementPipeline(mockWorker, {
        transcript: 'hello',
        promptText: null,
        metadata: null,
        currentModelId: 'test-model',
      }, { onProgress: jest.fn() });

      expect(mockWorker.sendRequest).toHaveBeenCalledWith('enhance', expect.objectContaining({
        transcript: 'hello',
      }), expect.any(Object));
    });

    it('passes promptText when provided', async () => {
      await runEnhancementPipeline(mockWorker, {
        transcript: 'hello',
        promptText: 'custom prompt',
        metadata: null,
        currentModelId: null,
      }, { onProgress: jest.fn() });

      expect(mockWorker.sendRequest).toHaveBeenCalledWith('enhance', expect.objectContaining({
        prompt: 'custom prompt',
      }), expect.any(Object));
    });

    it('normalises timestamp string to Date', async () => {
      const result = await runEnhancementPipeline(mockWorker, {
        transcript: 'hello',
        promptText: null,
        metadata: null,
        currentModelId: null,
      }, { onProgress: jest.fn() });

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('chunked path', () => {
    beforeEach(() => {
      getChunkingInfo.mockReturnValue({ needsChunking: true, estimatedChunks: 2 });
      chunkTranscript.mockReturnValue([
        { text: 'chunk one', index: 0, totalChunks: 2, startChar: 0, endChar: 9 },
        { text: 'chunk two', index: 1, totalChunks: 2, startChar: 10, endChar: 19 },
      ]);
      mockWorker.sendRequest
        .mockResolvedValueOnce({ ...SINGLE_RESULT, enhancedText: 'Chunk one.', improvements: { ...SINGLE_RESULT.improvements, fillerCount: 1 }, tokensGenerated: 5 })
        .mockResolvedValueOnce({ ...SINGLE_RESULT, enhancedText: 'Chunk two.', improvements: { ...SINGLE_RESULT.improvements, fillerCount: 2 }, tokensGenerated: 5 });
    });

    it('calls worker twice for two chunks', async () => {
      await runEnhancementPipeline(mockWorker, {
        transcript: 'chunk one chunk two',
        promptText: null,
        metadata: null,
        currentModelId: 'model',
      }, { onProgress: jest.fn() });

      expect(mockWorker.sendRequest).toHaveBeenCalledTimes(2);
    });

    it('merges enhanced chunks', async () => {
      const result = await runEnhancementPipeline(mockWorker, {
        transcript: 'chunk one chunk two',
        promptText: null,
        metadata: null,
        currentModelId: 'model',
      }, { onProgress: jest.fn() });

      expect(result.enhancedText).toBe('Chunk one. Chunk two.');
    });

    it('aggregates token count from all chunks', async () => {
      const result = await runEnhancementPipeline(mockWorker, {
        transcript: 'chunk one chunk two',
        promptText: null,
        metadata: null,
        currentModelId: 'model',
      }, { onProgress: jest.fn() });

      expect(result.tokensGenerated).toBe(10);
    });

    it('uses currentModelId in chunked result', async () => {
      const result = await runEnhancementPipeline(mockWorker, {
        transcript: 'chunk one chunk two',
        promptText: null,
        metadata: null,
        currentModelId: 'my-model',
      }, { onProgress: jest.fn() });

      expect(result.modelUsed).toBe('my-model');
    });
  });
});
