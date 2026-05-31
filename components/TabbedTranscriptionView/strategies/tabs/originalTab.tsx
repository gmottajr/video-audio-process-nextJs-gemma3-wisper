import React from 'react';
import { FileText } from 'lucide-react';
import { OriginalTabView } from '@/components/tabs/OriginalTabView';
import type { TabStrategy, TabViewContext } from '../../types';

const OriginalView: React.FC<TabViewContext> = ({ originalText, qualityMetrics }) => (
  <OriginalTabView text={originalText} readabilityScore={qualityMetrics?.readabilityBefore} />
);

export const originalTab: TabStrategy = {
  id: 'original',
  label: 'Original',
  shortLabel: 'Orig',
  Icon: FileText,
  description: 'Raw transcription from speech recognition',
  View: OriginalView,
  isEnabled: () => true,
};
