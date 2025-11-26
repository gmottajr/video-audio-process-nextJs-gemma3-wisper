"use client";

import { useEffect, useState } from 'react';
import { useMediaProcessor } from '@/hooks/useMediaProcessor';

interface MemoryInfo {
  blobs: {
    activeUrls: number;
    totalSizeMB: string;
    oldestAgeSeconds: number;
    oldestAgeMinutes: number;
  };
  heap: {
    used: string;
    total: string;
    limit: string;
    usagePercent: number;
  } | null;
}

/**
 * MemoryMonitor Component
 * 
 * Development-only component for monitoring:
 * - Blob URL memory usage
 * - JavaScript heap memory
 * - Potential memory leaks
 * 
 * Usage in app/page.tsx:
 * {process.env.NODE_ENV === 'development' && <MemoryMonitor />}
 */
export function MemoryMonitor() {
  const { getBlobStats } = useMediaProcessor();
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateMemory = () => {
      // Get blob stats
      const blobStats = getBlobStats();

      // Get browser memory if available (Chrome only)
      const browserMemory = (performance as any).memory;

      if (browserMemory) {
        const used = browserMemory.usedJSHeapSize;
        const total = browserMemory.totalJSHeapSize;
        const usagePercent = Math.round((used / total) * 100);

        setMemoryInfo({
          blobs: blobStats,
          heap: {
            used: (used / 1024 / 1024).toFixed(2),
            total: (total / 1024 / 1024).toFixed(2),
            limit: (browserMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
            usagePercent
          }
        });
      } else {
        setMemoryInfo({
          blobs: blobStats,
          heap: null
        });
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);

    return () => clearInterval(interval);
  }, [getBlobStats]);

  if (!memoryInfo) return null;

  // Determine health status
  const blobWarning = memoryInfo.blobs.oldestAgeMinutes > 5;
  const heapWarning = memoryInfo.heap && memoryInfo.heap.usagePercent > 80;
  const heapDanger = memoryInfo.heap && memoryInfo.heap.usagePercent > 90;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            px-4 py-2 rounded-lg shadow-lg text-sm font-mono font-bold
            transition-all hover:scale-105
            ${heapDanger ? 'bg-red-600 text-white animate-pulse' : 
              heapWarning || blobWarning ? 'bg-yellow-500 text-black' : 
              'bg-gray-900 text-white'}
          `}
        >
          🧠 {memoryInfo.heap ? `${memoryInfo.heap.usagePercent}%` : 'Mem'} 
          {memoryInfo.blobs.activeUrls > 0 && ` | ${memoryInfo.blobs.activeUrls} blobs`}
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-gray-900 text-white p-4 rounded-lg shadow-2xl text-xs font-mono w-80">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-sm">🧠 Memory Monitor</div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Blob URLs Section */}
          <div className="mb-3 p-2 bg-gray-800 rounded">
            <div className="text-gray-400 text-[10px] uppercase mb-1">Blob URLs</div>
            <div className="flex justify-between items-center">
              <span className="text-white">Active:</span>
              <span className={`font-bold ${memoryInfo.blobs.activeUrls > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                {memoryInfo.blobs.activeUrls}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white">Size:</span>
              <span className="text-blue-400">{memoryInfo.blobs.totalSizeMB} MB</span>
            </div>
            {memoryInfo.blobs.oldestAgeSeconds > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-white">Oldest:</span>
                <span className={`${blobWarning ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {memoryInfo.blobs.oldestAgeMinutes}min {memoryInfo.blobs.oldestAgeSeconds % 60}s
                  {blobWarning && ' ⚠️'}
                </span>
              </div>
            )}
          </div>

          {/* Heap Memory Section */}
          {memoryInfo.heap && (
            <div className="mb-3 p-2 bg-gray-800 rounded">
              <div className="text-gray-400 text-[10px] uppercase mb-1">JS Heap</div>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      heapDanger ? 'bg-red-500' :
                      heapWarning ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${memoryInfo.heap.usagePercent}%` }}
                  />
                </div>
                <div className={`text-right mt-1 font-bold ${
                  heapDanger ? 'text-red-400' :
                  heapWarning ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {memoryInfo.heap.usagePercent}%
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white">Used:</span>
                <span className="text-blue-400">{memoryInfo.heap.used} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Total:</span>
                <span className="text-gray-400">{memoryInfo.heap.total} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white">Limit:</span>
                <span className="text-gray-400">{memoryInfo.heap.limit} MB</span>
              </div>

              {heapWarning && (
                <div className="mt-2 p-2 bg-yellow-900 text-yellow-200 rounded text-[10px]">
                  ⚠️ High memory usage
                </div>
              )}
              {heapDanger && (
                <div className="mt-2 p-2 bg-red-900 text-red-200 rounded text-[10px] animate-pulse">
                  🚨 Critical memory usage!
                </div>
              )}
            </div>
          )}

          {/* Browser Info */}
          {!memoryInfo.heap && (
            <div className="p-2 bg-gray-800 rounded text-center text-gray-400 text-[10px]">
              Heap info unavailable
              <br />
              (Chrome/Edge only)
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 text-[9px] text-gray-500 text-center">
            Dev-only • Updates every 2s
          </div>
        </div>
      )}
    </div>
  );
}



