import { useState } from 'react';
import type { TabType } from '../types';

export function useActiveTab(initial: TabType = 'enhanced') {
  const [activeTab, setActiveTab] = useState<TabType>(initial);
  return { activeTab, setActiveTab };
}
