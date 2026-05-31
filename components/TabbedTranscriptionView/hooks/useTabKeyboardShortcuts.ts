import { useEffect } from 'react';
import type { TabStrategy, TabType } from '../types';

interface UseTabKeyboardShortcutsArgs {
  tabs: TabStrategy[];
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  handleCopy: () => void;
  setShowKeyboardHelp: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTabKeyboardShortcuts({
  tabs,
  setActiveTab,
  handleCopy,
  setShowKeyboardHelp,
  setShowExportMenu,
}: UseTabKeyboardShortcutsArgs): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tab = tabs[parseInt(e.key) - 1];
        if (tab) setActiveTab(tab.id);
        return;
      }
      if (ctrlKey && e.key === 'e') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'original' ? 'enhanced' : 'original'));
        return;
      }
      if (ctrlKey && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (e.key === '?' && !ctrlKey) {
        e.preventDefault();
        setShowKeyboardHelp((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, setActiveTab, handleCopy, setShowKeyboardHelp, setShowExportMenu]);
}
