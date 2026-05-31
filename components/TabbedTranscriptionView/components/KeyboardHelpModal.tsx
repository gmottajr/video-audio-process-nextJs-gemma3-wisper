"use client";

import React from 'react';
import { Keyboard } from 'lucide-react';

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const SHORTCUTS: Array<[string[], string]> = [
  [['Ctrl', '1–4'], 'Switch to tab'],
  [['Ctrl', 'E'], 'Toggle Original/Enhanced'],
  [['Ctrl', 'C'], 'Copy current tab'],
  [['?'], 'Show/hide shortcuts'],
  [['Esc'], 'Close dialogs'],
];

interface KeyboardHelpModalProps {
  show: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ show, onClose }: KeyboardHelpModalProps) {
  if (!show) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="fixed top-1/2 left-1/2 z-50 w-full max-w-md"
        style={{
          transform: 'translate(-50%, -50%)',
          background: '#14141f',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex items-center gap-2 mb-4"
          style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}
        >
          <Keyboard className="w-5 h-5" style={{ color: '#a78bfa' }} />
          Keyboard Shortcuts
        </div>
        <table className="w-full text-sm">
          <tbody style={{ color: '#8a8a9c' }}>
            {SHORTCUTS.map(([keys, label], i) => (
              <tr
                key={i}
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <td className="py-2" style={{ width: 140 }}>
                  {keys.map((k, j) => (
                    <span key={k}>
                      <kbd
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#f3f3f8',
                        }}
                      >
                        {k}
                      </kbd>
                      {j < keys.length - 1 && <span className="mx-1">+</span>}
                    </span>
                  ))}
                </td>
                <td className="py-2">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={onClose}
          className="mt-5 w-full transition-transform hover:scale-[1.01]"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}
