"use client";

import { useState, useEffect } from "react";
import type { DevicePreference } from "@/types/fast-mode";
import type { DetectedCaps } from "../types";
import { resolveUseGpu, resolveMemoryBudgetMB } from "../services/capabilityRecommender";

interface WorkerConfig {
  workers: number;
  useGPU: boolean;
  memoryBudgetMB: number;
  devicePreference: DevicePreference;
}

export function useWorkerConfig(
  caps: DetectedCaps | null,
  onWorkerConfigChange?: (config: WorkerConfig) => void
) {
  const [workerCount, setWorkerCount] = useState<number>(0);
  const [devicePreference, setDevicePreference] = useState<DevicePreference>("auto");

  useEffect(() => {
    if (caps && workerCount === 0) setWorkerCount(caps.recommendedWorkers);
  }, [caps, workerCount]);

  useEffect(() => {
    if (!caps || !onWorkerConfigChange) return;
    const useGPU = resolveUseGpu(devicePreference, caps);
    onWorkerConfigChange({
      workers: workerCount,
      useGPU,
      memoryBudgetMB: resolveMemoryBudgetMB(workerCount, useGPU),
      devicePreference,
    });
  }, [caps, workerCount, devicePreference, onWorkerConfigChange]);

  const useGPU = resolveUseGpu(devicePreference, caps);

  return { workerCount, setWorkerCount, devicePreference, setDevicePreference, useGPU };
}
