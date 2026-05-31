import { logEnhancementMetrics, type EnhancementTelemetry } from '@/utils/enhancementTelemetry';
import type { EnhancementResult, HardwareCapabilities } from '@/types/enhancement';

export interface TelemetryContext {
  modelId: string;
  capabilities: HardwareCapabilities;
  result: EnhancementResult;
  transcriptLength: number;
}

export function buildAndLogTelemetry(ctx: TelemetryContext): void {
  const telemetry: EnhancementTelemetry = {
    modelId: ctx.modelId,
    gpuTier: ctx.capabilities.gpuTier,
    gpuInfo: ctx.capabilities.gpuInfo?.description,
    downloadTime: 0,
    processingTime: ctx.result.processingTime,
    transcriptLength: ctx.transcriptLength,
    enhancedLength: ctx.result.enhancedText.length,
    fillerWordsRemoved: ctx.result.improvements.fillerCount,
    tokensGenerated: ctx.result.tokensGenerated || 0,
    wasCached: true,
    timestamp: new Date().toISOString(),
  };
  logEnhancementMetrics(telemetry);
}
