/**
 * @jest-environment jsdom
 */

import { originalTab } from '@/components/TabbedTranscriptionView/strategies/tabs/originalTab';
import { enhancedTab } from '@/components/TabbedTranscriptionView/strategies/tabs/enhancedTab';
import { sideBySideTab } from '@/components/TabbedTranscriptionView/strategies/tabs/sideBySideTab';
import { diffTab } from '@/components/TabbedTranscriptionView/strategies/tabs/diffTab';

// All tab strategies should always be enabled
describe('Tab strategy metadata', () => {
  const strategies = [originalTab, enhancedTab, sideBySideTab, diffTab];

  test.each(strategies)('$id: isEnabled always returns true', (strategy) => {
    expect(strategy.isEnabled({})).toBe(true);
    expect(strategy.isEnabled({ originalText: 'hello', currentEnhancedText: 'hi' })).toBe(true);
  });

  test.each(strategies)('$id: has a non-empty description', (strategy) => {
    expect(strategy.description.length).toBeGreaterThan(0);
  });

  test('originalTab has id "original"', () => {
    expect(originalTab.id).toBe('original');
  });

  test('enhancedTab has id "enhanced"', () => {
    expect(enhancedTab.id).toBe('enhanced');
  });

  test('sideBySideTab has id "sidebyside"', () => {
    expect(sideBySideTab.id).toBe('sidebyside');
  });

  test('diffTab has id "diff"', () => {
    expect(diffTab.id).toBe('diff');
  });
});
