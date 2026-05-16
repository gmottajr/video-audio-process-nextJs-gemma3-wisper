"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Check } from 'lucide-react';
import type { AppState } from '@/hooks/useAppStateMachine';

interface BreadcrumbsProps {
  currentState: AppState;
  onNavigate?: () => void;
}

const stateLabels: Record<AppState, string> = {
  IDLE:       'Select',
  INSPECT:    'Configure',
  PROCESSING: 'Processing',
  DONE:       'Complete',
  ERROR:      'Error',
};

const stateNumbers: Record<AppState, number> = {
  IDLE: 1, INSPECT: 2, PROCESSING: 3, DONE: 4, ERROR: 0,
};

const STEPS: AppState[] = ['IDLE', 'INSPECT', 'PROCESSING', 'DONE'];

export function Breadcrumbs({ currentState }: BreadcrumbsProps) {
  const currentIndex = STEPS.indexOf(currentState);
  const isError = currentState === 'ERROR';

  return (
    <nav className="flex items-center gap-2 mb-6 overflow-x-auto">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 mr-2 opacity-80 hover:opacity-100 transition-opacity shrink-0">
        <Image src="/branding/NeuralGrooveIcon.png" alt="Neural Groove" width={48} height={48} className="rounded-lg" />
        <span className="font-tchaikovsky tracking-[0.12em] text-xl text-aura-muted hidden sm:inline">Neural Groove</span>
      </Link>

      <div className="h-5 w-px shrink-0" style={{ background: "oklch(38% 0.02 280 / 0.40)" }} />

      {isError ? (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "oklch(30% 0.08 25 / 0.40)", border: "1px solid oklch(55% 0.18 25 / 0.35)" }}
        >
          <span className="font-jazz text-sm" style={{ color: "oklch(72% 0.14 25)" }}>Error</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {STEPS.map((state, index) => {
            const isActive = state === currentState;
            const isPast   = index < currentIndex;

            return (
              <div key={state} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isPast || isActive ? "oklch(50% 0.12 290)" : "oklch(38% 0.02 280 / 0.50)" }}
                  />
                )}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 shrink-0"
                  style={{
                    background: isActive ? "oklch(60% 0.28 290 / 0.15)" : "transparent",
                    border:     isActive ? "1px solid oklch(60% 0.28 290 / 0.35)" : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isActive
                        ? "oklch(60% 0.28 290)"
                        : isPast
                        ? "oklch(66% 0.17 195 / 0.25)"
                        : "oklch(38% 0.02 280 / 0.35)",
                    }}
                  >
                    {isPast ? (
                      <Check className="w-3 h-3" style={{ color: "oklch(66% 0.17 195)" }} />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: isActive ? "white" : "oklch(45% 0.02 280)" }}>
                        {stateNumbers[state]}
                      </span>
                    )}
                  </div>
                  <span
                    className="font-jazz text-sm tracking-widest"
                    style={{
                      color: isActive ? "oklch(84% 0.20 290)" : isPast ? "oklch(55% 0.02 280)" : "oklch(40% 0.02 280)",
                    }}
                  >
                    {stateLabels[state]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
