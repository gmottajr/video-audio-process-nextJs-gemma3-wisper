"use client";

import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { ORDERED_EXPORT_STRATEGIES } from '../strategies/export/registry';
import type { ExportFormat } from '../types';

interface ExportMenuProps {
  showExportMenu: boolean;
  onToggle: () => void;
  onExport: (format: ExportFormat) => void;
  onClose: () => void;
  hasChunks: boolean;
}

export function ExportMenu({ showExportMenu, onToggle, onExport, onClose, hasChunks }: ExportMenuProps) {
  const visibleStrategies = ORDERED_EXPORT_STRATEGIES.filter(
    (s) => !s.requiresChunks || hasChunks
  );

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
        style={{
          padding: '7px 11px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
        }}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {showExportMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div
            className="absolute right-0 mt-2 z-20 overflow-hidden"
            style={{
              width: 200,
              background: '#14141f',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            {visibleStrategies.map((strategy, i) => (
              <button
                key={strategy.id}
                onClick={() => onExport(strategy.id)}
                className="w-full text-left flex items-center gap-2 transition-colors hover:bg-white/5"
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#f3f3f8',
                  borderTop: i > 0 && strategy.requiresChunks && !visibleStrategies[i - 1]?.requiresChunks
                    ? '1px solid rgba(255,255,255,0.06)'
                    : undefined,
                }}
              >
                <span>{strategy.icon}</span>
                {strategy.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
