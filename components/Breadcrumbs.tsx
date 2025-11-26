"use client";

import { ChevronRight, Home } from 'lucide-react';
import type { AppState } from '@/hooks/useAppStateMachine';

interface BreadcrumbsProps {
  currentState: AppState;
  onNavigate?: () => void;
}

const stateLabels: Record<AppState, string> = {
  IDLE: 'Upload',
  INSPECT: 'Configure',
  PROCESSING: 'Processing',
  DONE: 'Complete',
  ERROR: 'Error'
};

const stateIcons: Record<AppState, string> = {
  IDLE: '📁',
  INSPECT: '⚙️',
  PROCESSING: '⚡',
  DONE: '✓',
  ERROR: '⚠️'
};

export function Breadcrumbs({ currentState, onNavigate }: BreadcrumbsProps) {
  const states: AppState[] = ['IDLE', 'INSPECT', 'PROCESSING', 'DONE'];
  const currentIndex = states.indexOf(currentState);
  
  // If error state, show it separately
  const isError = currentState === 'ERROR';
  
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6 overflow-x-auto">
      {/* Home/Start */}
      <button
        onClick={onNavigate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors group"
        title="Start Over"
      >
        <Home className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
        <span className="text-zinc-400 group-hover:text-zinc-200 font-medium">Home</span>
      </button>

      {isError ? (
        <>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-950/30 border border-red-500/20">
            <span className="text-lg">{stateIcons.ERROR}</span>
            <span className="text-red-400 font-semibold">{stateLabels.ERROR}</span>
          </div>
        </>
      ) : (
        <>
          {states.map((state, index) => {
            const isActive = state === currentState;
            const isPast = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={state} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-zinc-600 mx-1" />
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10'
                      : isPast
                      ? 'text-zinc-500'
                      : 'text-zinc-600'
                  }`}
                >
                  <span className={`text-lg ${isActive ? 'scale-110' : ''} transition-transform`}>
                    {stateIcons[state]}
                  </span>
                  <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {stateLabels[state]}
                  </span>
                  {isPast && (
                    <span className="text-xs text-green-400">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}

