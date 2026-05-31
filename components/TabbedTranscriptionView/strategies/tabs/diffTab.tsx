import React from 'react';
import { GitCompare } from 'lucide-react';
import { DiffTabView } from '@/components/tabs/DiffTabView';
import type { TabStrategy, TabViewContext } from '../../types';

const DiffView: React.FC<TabViewContext> = ({ originalText, currentEnhancedText }) => (
  <DiffTabView originalText={originalText} enhancedText={currentEnhancedText} />
);

export const diffTab: TabStrategy = {
  id: 'diff',
  label: 'Diff View',
  shortLabel: 'Diff',
  Icon: GitCompare,
  description: 'See exactly what changed with highlights',
  View: DiffView,
  isEnabled: () => true,
};
