import { useEffect } from 'react';
import { isValidTabId } from '../strategies/tabs/registry';
import type { TabType } from '../types';

export function useUrlHashSync(
  activeTab: TabType,
  setActiveTab: (tab: TabType) => void
): void {
  // Read hash / sessionStorage on mount to restore last-active tab
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (isValidTabId(hash)) {
      setActiveTab(hash);
      return;
    }
    try {
      const saved = sessionStorage.getItem('mediaforge_active_tab');
      if (saved && isValidTabId(saved)) setActiveTab(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push hash + sessionStorage on every tab change
  useEffect(() => {
    const newUrl = `${window.location.pathname}${window.location.search}#${activeTab}`;
    window.history.replaceState(null, '', newUrl);
    try {
      sessionStorage.setItem('mediaforge_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Sync on external hash navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (isValidTabId(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveTab]);
}
