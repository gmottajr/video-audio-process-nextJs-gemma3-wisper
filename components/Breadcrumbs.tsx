"use client";

import Image from 'next/image';
import { ChevronRight, Home } from 'lucide-react';
import type { AppState } from '@/hooks/useAppStateMachine';

interface BreadcrumbsProps {
  currentState: AppState;
  onNavigate?: () => void;
}

const stateLabels: Record<AppState, string> = {
  IDLE: 'Select',
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
    <nav className="flex items-center space-x-3 text-base mb-6 overflow-x-auto">
      {/* Brand Icon */}
      <div className="flex items-center mr-4">
        <Image
          src="/branding/NeuralGrooveIcon.png"
          alt="Neural Groove"
          width={56}
          height={56}
          className="rounded-lg"
        />
      </div>

      {/* Home/Start */}
      <button
        onClick={onNavigate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-amber-950/30 border border-transparent hover:border-amber-500/30 transition-colors group"
        title="Start Over"
      >
        <Home className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />
        <span className="text-amber-400 group-hover:text-amber-300 font-medium">Home</span>
      </button>

      {isError ? (
        <>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-red-950/30 border border-red-500/20">
            <span className="text-xl">{stateIcons.ERROR}</span>
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
                <ChevronRight className="w-5 h-5 text-zinc-600 mx-1" />
                <div
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10'
                      : isPast
                      ? 'text-zinc-500'
                      : 'text-zinc-600'
                  }`}
                >
                  <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
                    {stateIcons[state]}
                  </span>
                  <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {stateLabels[state]}
                  </span>
                  {isPast && (
                    <span className="text-sm text-green-400">✓</span>
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


