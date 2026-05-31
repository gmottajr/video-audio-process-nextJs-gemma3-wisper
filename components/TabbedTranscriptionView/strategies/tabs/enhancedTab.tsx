import React from 'react';
import { Sparkles } from 'lucide-react';
import { EnhancedTabView } from '@/components/tabs/EnhancedTabView';
import type { TabStrategy, TabViewContext } from '../../types';

const EnhancedView: React.FC<TabViewContext> = ({
  currentEnhancedText,
  qualityMetrics,
  processingTime,
  isEditing,
  onTextChange,
  hasEdits,
}) => (
  <EnhancedTabView
    text={currentEnhancedText}
    qualityMetrics={qualityMetrics}
    readabilityScore={qualityMetrics?.readabilityAfter}
    processingTime={processingTime}
    isEditable={isEditing}
    onTextChange={onTextChange}
    hasEdits={hasEdits}
  />
);

export const enhancedTab: TabStrategy = {
  id: 'enhanced',
  label: 'Enhanced',
  shortLabel: 'Enh',
  Icon: Sparkles,
  description: 'AI-improved version with filler words removed',
  View: EnhancedView,
  isEnabled: () => true,
};
