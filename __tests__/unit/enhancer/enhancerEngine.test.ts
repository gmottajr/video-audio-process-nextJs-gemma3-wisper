import { createDefaultEnhancerEngine } from '@/services/enhancer/enhancerEngine';

const mockSendRequest = jest.fn();
const mockDispose = jest.fn();

jest.mock('@/lib/WorkerManager', () => ({
  WorkerManager: jest.fn().mockImplementation(() => ({
    sendRequest: mockSendRequest,
    dispose: mockDispose,
  })),
}));

jest.mock('@/utils/transcriptChunker', () => ({
  getChunkingInfo: jest.fn(() => ({ needsChunking: false, estimatedChunks: 1 })),
  chunkTranscript: jest.fn(),
  mergeChunks: jest.fn(),
}));

const ENHANCE_RESULT = {
  originalText: 'test',
  enhancedText: 'Test.',
  improvements: { fillerWordsRemoved: [], fillerCount: 0, grammarFixes: 0, originalWordCount: 1, enhancedWordCount: 1, originalCharCount: 4, enhancedCharCount: 5, compressionRatio: 1.25, reductionPercentage: 0 },
  processingTime: 1,
  tokensGenerated: 5,
  modelUsed: 'test-model',
  timestamp: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSendRequest.mockReset();
});

describe('createDefaultEnhancerEngine', () => {
  describe('loadModel', () => {
    it('calls worker init with the given modelId', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });
      const engine = createDefaultEnhancerEngine();

      await engine.loadModel('my-model', { onProgress: jest.fn() });

      expect(mockSendRequest).toHaveBeenCalledWith('init', { modelId: 'my-model' }, expect.any(Object));
    });

    it('propagates progress via onProgress callback', async () => {
      mockSendRequest.mockImplementationOnce(async (_cmd, _payload, opts) => {
        opts.onProgress(50, 'Halfway...');
        return { status: 'ready' };
      });
      const engine = createDefaultEnhancerEngine();
      const onProgress = jest.fn();

      await engine.loadModel('my-model', { onProgress });

      expect(onProgress).toHaveBeenCalledWith(50, 'Halfway...', undefined);
    });

    it('throws when worker sendRequest rejects', async () => {
      mockSendRequest.mockRejectedValueOnce(new Error('network error'));
      const engine = createDefaultEnhancerEngine();

      await expect(engine.loadModel('my-model', { onProgress: jest.fn() }))
        .rejects.toThrow('network error');
    });
  });

  describe('enhance', () => {
    it('calls worker enhance after loadModel', async () => {
      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })  // init
        .mockResolvedValueOnce(ENHANCE_RESULT);        // enhance

      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });
      await engine.enhance({ transcript: 'test' }, { onProgress: jest.fn() });

      expect(mockSendRequest).toHaveBeenCalledWith('enhance', expect.objectContaining({
        transcript: 'test',
      }), expect.any(Object));
    });

    it('returns EnhancementResult with Date timestamp', async () => {
      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockResolvedValueOnce(ENHANCE_RESULT);

      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });
      const result = await engine.enhance({ transcript: 'test' }, { onProgress: jest.fn() });

      expect(result.enhancedText).toBe('Test.');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('calls onMetadataExtracted when context-aware strategy fires', async () => {
      // With useContextAware:false (default in engine), metadata is always null
      // This test verifies onMetadataExtracted is NOT called for simple strategy
      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockResolvedValueOnce(ENHANCE_RESULT);

      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });

      const onMetadataExtracted = jest.fn();
      await engine.enhance({ transcript: 'test' }, { onProgress: jest.fn(), onMetadataExtracted });

      expect(onMetadataExtracted).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('sends cancel request to worker', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' }).mockResolvedValueOnce({});
      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });

      engine.cancel();

      expect(mockSendRequest).toHaveBeenCalledWith('cancel', {}, expect.any(Object));
    });
  });

  describe('reset', () => {
    it('sends reset request to worker', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' }).mockResolvedValueOnce({ status: 'reset' });
      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });

      await engine.reset();

      expect(mockSendRequest).toHaveBeenCalledWith('reset', {}, expect.any(Object));
    });
  });

  describe('dispose', () => {
    it('disposes the worker', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });
      const engine = createDefaultEnhancerEngine();
      await engine.loadModel('my-model', { onProgress: jest.fn() });

      engine.dispose();

      expect(mockDispose).toHaveBeenCalled();
    });
  });
});
