/**
 * WorkerStatusBadge
 * 
 * Small badge displaying active worker count and status.
 */

"use client";

import React from 'react';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WorkerPoolStatus } from '@/types/fast-mode';

interface WorkerStatusBadgeProps {
  /** Worker pool status */
  status: WorkerPoolStatus;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function WorkerStatusBadge({ status, size = 'sm' }: WorkerStatusBadgeProps) {
  const { total, busy, crashed } = status;
  const healthy = total - crashed;

  // Determine color based on status
  let colorClass = 'text-green-400 bg-green-500/20 border-green-500/30';
  let icon = <CheckCircle2 className="w-3 h-3" />;

  if (crashed > 0 && healthy === 0) {
    // All workers crashed
    colorClass = 'text-red-400 bg-red-500/20 border-red-500/30';
    icon = <AlertCircle className="w-3 h-3" />;
  } else if (crashed > 0) {
    // Some workers crashed
    colorClass = 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    icon = <AlertCircle className="w-3 h-3" />;
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${colorClass} ${sizeClasses}
      `}
      title={`${healthy} of ${total} workers healthy, ${busy} busy`}
    >
      {icon}
      <Users className="w-3 h-3" />
      <span>{healthy}/{total}</span>
      {busy > 0 && <span className="ml-1">({busy} busy)</span>}
    </div>
  );
}
