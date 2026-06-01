import { useState, useCallback, useEffect } from "react";
import { useEnhancerContextOptional } from "@/contexts/EnhancerContext";
import type { EnhancementResult } from "@/types/enhancement";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

interface UseEnhancerHmrSyncProps {
  result: ProcessingResult;
  metrics: any;
}

export function useEnhancerHmrSync({ result, metrics }: UseEnhancerHmrSyncProps) {
  const [enhancementEnabled, setEnhancementEnabled] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<EnhancementResult | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<EnhancementQualityMetrics | null>(null);

  const enhancer = useEnhancerContextOptional();

  useEffect(() => {
    if (enhancer?.lastResult && !enhancedResult) {
      setEnhancedResult(enhancer.lastResult);
      setEnhancementEnabled(true);
    }
  }, [enhancer?.lastResult, enhancedResult]);

  useEffect(() => {
    if (enhancer?.progress?.stage === "complete" && enhancer?.lastResult && !enhancedResult) {
      setEnhancedResult(enhancer.lastResult);
      setEnhancementEnabled(true);
    }
  }, [enhancer?.progress?.stage, enhancer?.lastResult, enhancedResult]);

  const handleEnhancementToggle = useCallback(
    async (enabled: boolean) => {
      setEnhancementEnabled(enabled);
      if (enabled && result.type === "transcription" && result.transcription?.text && enhancer) {
        try {
          if (!enhancer.isModelLoaded && !enhancer.isModelLoading) await enhancer.loadModel();
          const enhancementResult = await enhancer.enhance(
            result.transcription.text,
            result.transcription,
            metrics?.duration
          );
          setEnhancedResult(enhancementResult);
        } catch (error) {
          console.error("[DoneStateView] Enhancement failed:", error);
        }
      }
    },
    [result, enhancer, metrics]
  );

  const handleReEnhance = useCallback(() => {
    setEnhancedResult(null);
    setQualityMetrics(null);
    setEnhancementEnabled(false);
  }, []);

  return {
    enhancementEnabled,
    setEnhancementEnabled,
    enhancedResult,
    qualityMetrics,
    enhancer,
    handleEnhancementToggle,
    handleReEnhance,
  };
}
