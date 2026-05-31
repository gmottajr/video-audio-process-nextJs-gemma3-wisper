import { originalTab } from './originalTab';
import { enhancedTab } from './enhancedTab';
import { sideBySideTab } from './sideBySideTab';
import { diffTab } from './diffTab';
import type { TabStrategy, TabType } from '../../types';

export const ORDERED_TABS: TabStrategy[] = [
  originalTab,
  enhancedTab,
  sideBySideTab,
  diffTab,
];

export const TAB_REGISTRY = new Map<TabType, TabStrategy>(
  ORDERED_TABS.map((s) => [s.id, s])
);

export function getTabStrategy(id: TabType): TabStrategy {
  const strategy = TAB_REGISTRY.get(id);
  if (!strategy) throw new Error(`No tab strategy registered for id: ${id}`);
  return strategy;
}

export const VALID_TAB_IDS = new Set<string>(ORDERED_TABS.map((s) => s.id));

export function isValidTabId(value: string): value is TabType {
  return VALID_TAB_IDS.has(value);
}
