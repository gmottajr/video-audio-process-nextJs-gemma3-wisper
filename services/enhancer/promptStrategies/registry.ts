import type { PromptStrategy, PromptSelectionContext, PromptBuildResult } from './types';

const registry: Array<{ strategy: PromptStrategy; priority: number }> = [];

export function register(strategy: PromptStrategy, priority: number): void {
  registry.push({ strategy, priority });
  registry.sort((a, b) => a.priority - b.priority);
}

export function selectPromptStrategy(ctx: PromptSelectionContext): PromptStrategy {
  const match = registry.find(entry => entry.strategy.isApplicable(ctx));
  if (!match) throw new Error('No PromptStrategy registered — ensure index.ts is imported');
  return match.strategy;
}

export function getAllStrategies(): PromptStrategy[] {
  return registry.map(e => e.strategy);
}
