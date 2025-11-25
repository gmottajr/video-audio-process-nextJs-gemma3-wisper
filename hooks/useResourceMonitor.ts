"use client";

import { useState, useEffect, useCallback } from "react";

export type HardwareTier = "low" | "medium" | "high";

export interface HardwareCapability {
  tier: HardwareTier;
  deviceMemoryGB: number | null;
  maxFileSize: number; // in bytes
  maxFileSizeMB: number; // in MB (for display)
}

interface ResourceMonitorData {
  memoryUsageMB: number;
  isHighLoad: boolean;
}

interface UseResourceMonitorOptions {
  isActive?: boolean;
  interval?: number;
  highLoadThresholdMB?: number;
}

/**
 * Detect hardware capabilities based on device memory
 * 
 * Uses navigator.deviceMemory (Chrome/Edge only)
 * Returns tier and corresponding file size limits
 */
export function detectHardwareCapability(): HardwareCapability {
  // @ts-ignore - deviceMemory is non-standard but available in Chrome/Edge
  const deviceMemory = navigator.deviceMemory as number | undefined;

  // Determine tier based on device memory
  let tier: HardwareTier = "low";
  let maxFileSizeMB = 100; // Default: 100MB (conservative)

  if (deviceMemory !== undefined) {
    if (deviceMemory >= 8) {
      tier = "high";
      maxFileSizeMB = 2048; // 2GB - Safe limit for 32-bit WASM
    } else if (deviceMemory >= 4) {
      tier = "medium";
      maxFileSizeMB = 500; // 500MB
    } else {
      tier = "low";
      maxFileSizeMB = 100; // 100MB
    }
  } else {
    // If API not available, assume low tier (conservative)
    tier = "low";
    maxFileSizeMB = 100;
  }

  return {
    tier,
    deviceMemoryGB: deviceMemory ?? null,
    maxFileSize: maxFileSizeMB * 1024 * 1024, // Convert to bytes
    maxFileSizeMB,
  };
}

/**
 * useResourceMonitor Hook
 * 
 * Chrome/Edge ONLY - Uses performance.memory API
 * No fallbacks for other browsers (performance-first approach)
 */
export function useResourceMonitor(options: UseResourceMonitorOptions = {}): ResourceMonitorData {
  const {
    isActive = true,
    interval = 1000, // Poll every 1 second
    highLoadThresholdMB = 1500, // Consider >1.5GB as high load
  } = options;

  const [memoryUsageMB, setMemoryUsageMB] = useState(0);
  const [isHighLoad, setIsHighLoad] = useState(false);

  // Get memory usage - Chrome/Edge only
  const getMemoryUsage = useCallback((): number => {
    // @ts-ignore - performance.memory is non-standard but available in Chrome/Edge
    if (typeof performance !== "undefined" && performance.memory) {
      // @ts-ignore
      const usedJSHeapSize = performance.memory.usedJSHeapSize;
      const usageMB = usedJSHeapSize / 1024 / 1024; // Convert bytes to MB
      return Math.round(usageMB);
    }
    return 0;
  }, []);

  // Poll memory usage
  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Initial read
    const initialMemory = getMemoryUsage();
    setMemoryUsageMB(initialMemory);
    setIsHighLoad(initialMemory > highLoadThresholdMB);

    // Set up polling
    const intervalId = setInterval(() => {
      const currentMemory = getMemoryUsage();
      setMemoryUsageMB(currentMemory);
      setIsHighLoad(currentMemory > highLoadThresholdMB);
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, interval, highLoadThresholdMB, getMemoryUsage]);

  return {
    memoryUsageMB,
    isHighLoad,
  };
}

/**
 * useHardwareCapability Hook
 * 
 * Detects device hardware tier and returns appropriate file size limits
 * Uses navigator.deviceMemory (Chrome/Edge only)
 */
export function useHardwareCapability(): HardwareCapability {
  const [capability, setCapability] = useState<HardwareCapability>(() =>
    detectHardwareCapability()
  );

  useEffect(() => {
    // Detect on mount
    const detected = detectHardwareCapability();
    setCapability(detected);

    console.log(`[Hardware Detection] Tier: ${detected.tier}, Device Memory: ${detected.deviceMemoryGB ?? "unknown"}GB, Max File Size: ${detected.maxFileSizeMB}MB`);
  }, []);

  return capability;
}

