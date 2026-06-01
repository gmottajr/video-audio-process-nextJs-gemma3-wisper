import type { ActionType, ActionStrategy } from "../../types";
import type { VideoMode } from "@/components/VideoModeTabs";

const registry = new Map<ActionType, ActionStrategy>();

export function register(strategy: ActionStrategy): void {
  registry.set(strategy.id, strategy);
}

export function getActionStrategy(id: ActionType): ActionStrategy {
  const strategy = registry.get(id);
  if (!strategy) throw new Error(`[ActionSelector] No strategy registered for id: "${id}"`);
  return strategy;
}

export function getAvailableStrategy(file: File, videoMode: VideoMode): ActionStrategy | null {
  const strategies = Array.from(registry.values());
  for (const strategy of strategies) {
    if (strategy.appliesTo(file, videoMode)) return strategy;
  }
  return null;
}
