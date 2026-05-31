import { useState, useCallback } from 'react';
import type { TabType } from '../types';

interface UseCopyToClipboardArgs {
  activeTab: TabType;
  originalText: string;
  currentEnhancedText: string;
  onCopy?: (text: string, tabType: TabType) => void;
}

function getTextForTab(
  tab: TabType,
  originalText: string,
  currentEnhancedText: string
): string {
  switch (tab) {
    case 'original':    return originalText;
    case 'enhanced':    return currentEnhancedText;
    case 'diff':        return currentEnhancedText;
    case 'sidebyside':  return `ORIGINAL:\n${originalText}\n\n─────────────────────────\n\nENHANCED:\n${currentEnhancedText}`;
    default:            return currentEnhancedText;
  }
}

export function useCopyToClipboard({
  activeTab,
  originalText,
  currentEnhancedText,
  onCopy,
}: UseCopyToClipboardArgs) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = getTextForTab(activeTab, originalText, currentEnhancedText);
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onCopy?.(text, activeTab);
    } catch (err) {
      console.error('[TabbedTranscriptionView] Failed to copy:', err);
    }
  }, [activeTab, originalText, currentEnhancedText, onCopy]);

  return { copySuccess, handleCopy };
}
