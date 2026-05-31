"use client";

import React from 'react';
import type { TabStrategy, TabType } from '../types';
import type { EnhancementQualityMetrics } from '@/types/quality-metrics';

const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

interface TabStripProps {
  tabs: TabStrategy[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  qualityMetrics?: EnhancementQualityMetrics | null;
  hasEdits: boolean;
}

export function TabStrip({ tabs, activeTab, onTabChange, qualityMetrics, hasEdits }: TabStripProps) {
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,8,15,0.4)',
      }}
    >
      <div className="flex overflow-x-auto" role="tablist" aria-label="Transcription view options">
        {tabs.map((tab, index) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-2 transition-all whitespace-nowrap"
              style={{
                padding: '14px 18px',
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
                marginBottom: -1,
                color: active ? '#f3f3f8' : '#8a8a9c',
                background: active ? 'rgba(139,92,246,0.06)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: active ? '#a78bfa' : '#5b5b6e' }}>
                <tab.Icon className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>

              {tab.id === 'enhanced' && qualityMetrics && !hasEdits && (
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(16,185,129,0.15)',
                    color: '#34d399',
                    letterSpacing: '0.06em',
                  }}
                >
                  ✓
                </span>
              )}
              {tab.id === 'enhanced' && hasEdits && (
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(245,158,11,0.15)',
                    color: '#fbbf24',
                  }}
                >
                  edited
                </span>
              )}
              <span
                className="hidden lg:inline"
                style={{ fontFamily: FONT_MONO, fontSize: 10, color: '#5b5b6e', marginLeft: 4 }}
              >
                ({index + 1})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
