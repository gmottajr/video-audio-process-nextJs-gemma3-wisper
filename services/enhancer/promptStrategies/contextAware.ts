import { extractWhisperMetadata } from '@/utils/whisperMetadataExtractor';
import { generateEnhancementStrategy } from '@/utils/enhancementStrategyGenerator';
import { buildContextAwarePrompt } from '@/utils/contextAwarePromptBuilder';
import type { PromptStrategy, PromptSelectionContext, PromptBuildResult } from './types';
import { register } from './registry';

const NULL_RESULT: PromptBuildResult = { promptText: null, metadata: null, enhancementStrategy: null };

const strategy: PromptStrategy = {
  id: 'context-aware',

  isApplicable: (ctx: PromptSelectionContext): boolean =>
    ctx.useContextAware && !!ctx.whisperResult,

  build: (ctx: PromptSelectionContext): PromptBuildResult => {
    if (!ctx.whisperResult) return NULL_RESULT;
    try {
      const metadata = extractWhisperMetadata(ctx.whisperResult, ctx.audioDuration);
      const enhancementStrategy = generateEnhancementStrategy(metadata);
      const promptText = buildContextAwarePrompt({ metadata, strategy: enhancementStrategy });
      return { promptText, metadata, enhancementStrategy };
    } catch {
      return NULL_RESULT;
    }
  },
};

register(strategy, 0);

export default strategy;
