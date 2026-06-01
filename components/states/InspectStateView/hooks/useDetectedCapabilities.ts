"use client";

import { useState, useEffect } from "react";
import type { DetectedCaps } from "../types";

export function useDetectedCapabilities(): { caps: DetectedCaps | null } {
  const [caps, setCaps] = useState<DetectedCaps | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/utils/systemCapabilities").then(async (mod) => {
      try {
        const c = await mod.detectSystemCapabilities();
        const rec = mod.calculateOptimalWorkers(c);
        if (cancelled) return;
        setCaps({
          cpuThreads: c.cpu.threads,
          gpu: c.gpu.webgpuSupported,
          gpuDevice: c.gpu.device || null,
          ramGB: Math.round(c.memory.totalGB),
          recommendedWorkers: rec.recommendedWorkers,
          maxWorkers: rec.maxWorkers,
        });
      } catch {
        if (cancelled) return;
        setCaps({
          cpuThreads:
            typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
          gpu: false,
          gpuDevice: null,
          ramGB: 0,
          recommendedWorkers: 2,
          maxWorkers: 4,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { caps };
}
