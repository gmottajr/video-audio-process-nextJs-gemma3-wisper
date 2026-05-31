"use client";

import React from 'react';
import { Edit3, RotateCcw } from 'lucide-react';
import type { TabType } from '../types';

interface EditModeBarProps {
  activeTab: TabType;
  isEditing: boolean;
  hasEdits: boolean;
  onToggleEdit: () => void;
  onResetEdits: () => void;
}

export function EditModeBar({
  activeTab,
  isEditing,
  hasEdits,
  onToggleEdit,
  onResetEdits,
}: EditModeBarProps) {
  return (
    <>
      {activeTab === 'enhanced' && (
        <button
          onClick={onToggleEdit}
          title={isEditing ? 'Exit edit mode' : 'Edit enhanced text'}
          className="flex items-center gap-1.5 transition-colors"
          style={{
            padding: '7px 11px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: isEditing ? '#f59e0b' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isEditing ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
            color: isEditing ? '#0d0d18' : '#f3f3f8',
            cursor: 'pointer',
          }}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
        </button>
      )}

      {hasEdits && (
        <button
          onClick={onResetEdits}
          title="Reset to AI-generated text"
          className="flex items-center gap-1.5 transition-colors"
          style={{
            padding: '7px 11px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#fbbf24',
            cursor: 'pointer',
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      )}
    </>
  );
}
