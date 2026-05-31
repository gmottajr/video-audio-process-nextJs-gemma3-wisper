import React from 'react';
import { Columns } from 'lucide-react';
import { SideBySideTabView } from '@/components/tabs/SideBySideTabView';
import type { TabStrategy, TabViewContext } from '../../types';

const SideBySideView: React.FC<TabViewContext> = ({
  originalText,
  currentEnhancedText,
  qualityMetrics,
  syncScroll,
  onSyncScrollChange,
}) => (
  <SideBySideTabView
    originalText={originalText}
    enhancedText={currentEnhancedText}
    qualityMetrics={qualityMetrics}
    syncScroll={syncScroll}
    onSyncScrollChange={onSyncScrollChange}
  />
);

export const sideBySideTab: TabStrategy = {
  id: 'sidebyside',
  label: 'Side-by-Side',
  shortLabel: 'Compare',
  Icon: Columns,
  description: 'Compare original and enhanced versions',
  View: SideBySideView,
  isEnabled: () => true,
};
