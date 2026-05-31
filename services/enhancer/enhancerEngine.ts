import { WorkerManager } from '@/lib/WorkerManager';
import type { EnhancerEngine, EnhanceInput, EnhanceOptions, LoadModelOptions } from './types';
import { runEnhancementPipeline } from './enhancementPipeline';
import { selectPromptStrategy } from './promptStrategies/registry';
import './promptStrategies/index';

export function createDefaultEnhancerEngine(): EnhancerEngine {
  let worker: WorkerManager | null = null;
  let _currentModelId: string | null = null;

  function getWorker(): WorkerManager {
    if (!worker) {
      worker = new WorkerManager('/enhancer.worker.js');
    }
    return worker;
  }

  return {
    async loadModel(modelId: string, options: LoadModelOptions): Promise<void> {
      const w = getWorker();
      const { onProgress } = options;

      await w.sendRequest('init', { modelId }, {
        timeoutMs: 600000,
        onProgress: (prog, msg, extra) => {
          onProgress(prog, msg, extra as { totalMB?: number; downloadedMB?: number } | undefined);
        },
      });

      _currentModelId = modelId;
    },

    async enhance(input: EnhanceInput, options: EnhanceOptions) {
      const { transcript, whisperResult, audioDuration } = input;
      const { onProgress, onMetadataExtracted } = options;
      const w = getWorker();

      const ctx = { useContextAware: false, whisperResult, audioDuration };
      const strategy = selectPromptStrategy(ctx);
      const { promptText, metadata, enhancementStrategy } = strategy.build(ctx);

      if (metadata && enhancementStrategy && onMetadataExtracted) {
        onMetadataExtracted(metadata, enhancementStrategy);
      }

      return runEnhancementPipeline(w, {
        transcript,
        promptText,
        metadata,
        currentModelId: _currentModelId,
      }, { onProgress });
    },

    cancel(): void {
      worker?.sendRequest('cancel', {}, { timeoutMs: 5000 }).catch(() => {});
    },

    async reset(): Promise<void> {
      if (worker) {
        await worker.sendRequest('reset', {}, { timeoutMs: 30000 });
      }
      _currentModelId = null;
    },

    dispose(): void {
      if (worker) {
        worker.dispose();
        worker = null;
      }
    },
  };
}
