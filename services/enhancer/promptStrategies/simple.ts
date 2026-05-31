import type { PromptStrategy, PromptBuildResult } from './types';
import { register } from './registry';

const NULL_RESULT: PromptBuildResult = { promptText: null, metadata: null, enhancementStrategy: null };

const strategy: PromptStrategy = {
  id: 'simple',

  isApplicable: (): boolean => true,

  build: (): PromptBuildResult => NULL_RESULT,
};

register(strategy, 1);

export default strategy;
