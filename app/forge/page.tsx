"use client";

import { useState, useCallback } from "react";
import { FontSelector } from "@/components/FontSelector";
import { ForgeTopBar } from "@/components/ForgeTopBar";
import { NeuralNetBackground } from "@/components/NeuralNetBackground";
import { useAppStateMachine } from "@/hooks/useAppStateMachine";
import { useMediaProcessor } from "@/hooks/useMediaProcessor";
import { useResourceMonitor, useHardwareCapability } from "@/hooks/useResourceMonitor";
import type { ModelKey } from "@/components/ModelSelector";
import { useTranscriberFast } from "@/hooks/useTranscriberFast";
import type { TranscriptionMode, DevicePreference } from "@/types/fast-mode";
import { isFeatureEnabled } from "@/lib/featureFlags";

import { useModelAutoLoad } from "./_hooks/useModelAutoLoad";
import { useProcessorResultSync } from "./_hooks/useProcessorResultSync";
import { useLargeFileBanner } from "./_hooks/useLargeFileBanner";
import { useFFmpegAutoLoad } from "./_hooks/useFFmpegAutoLoad";
import { useForgeStateAnimations } from "./_hooks/useForgeStateAnimations";
import { useForgeHandlers } from "./_hooks/useForgeHandlers";
import { getStateView } from "./_strategies/stateViews/registry";
import { ForgeProcessingOverlays } from "./_components/ForgeProcessingOverlays";
import type { ForgePageBag } from "./_strategies/stateViews/types";

export default function Home() {
  const stateMachine = useAppStateMachine();
  const processor = useMediaProcessor();

  const [selectedModelKey, setSelectedModelKey] = useState<ModelKey>("base");
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("standard");
  const fastModeEnabled = isFeatureEnabled("ENABLE_FAST_MODE");
  const fastTranscriber = useTranscriberFast();
  const updateFastConfig = fastTranscriber.updateConfig;

  const handleWorkerConfigChange = useCallback(
    (config: { workers: number; useGPU: boolean; memoryBudgetMB: number; devicePreference: DevicePreference }) => {
      updateFastConfig({ maxWorkers: config.workers, memoryBudgetMB: config.memoryBudgetMB, devicePreference: config.devicePreference });
    },
    [updateFastConfig]
  );

  const hardwareCapability = useHardwareCapability();
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: stateMachine.state === "PROCESSING" || processor.isFFmpegLoading,
  });

  const largeFileBanner = useLargeFileBanner(stateMachine.selectedFile);
  const { contentRef } = useForgeStateAnimations(stateMachine.state);

  useModelAutoLoad({
    state: stateMachine.state, selectedFile: stateMachine.selectedFile,
    transcriptionMode, fastModeEnabled, selectedModelKey,
    loadModel: processor.transcriber.loadModel,
  });

  useFFmpegAutoLoad({
    state: stateMachine.state, selectedFile: stateMachine.selectedFile,
    isFFmpegLoaded: processor.isFFmpegLoaded, isFFmpegLoading: processor.isFFmpegLoading,
    ffmpeg: processor.ffmpeg, failProcessing: stateMachine.failProcessing,
  });

  useProcessorResultSync({
    processorResult: processor.result, processorError: processor.error,
    state: stateMachine.state, currentAction: stateMachine.currentAction,
    completeProcessing: stateMachine.completeProcessing, failProcessing: stateMachine.failProcessing,
  });

  const { handleAction, handleDownload, handleReset, handleModelSelect, handleTranscribeFromDone } =
    useForgeHandlers({
      stateMachine, processor, transcriptionMode, selectedModelKey,
      fastModeEnabled, fastTranscriber, setSelectedModelKey,
    });

  const pageBag: ForgePageBag = {
    selectedFile: stateMachine.selectedFile,
    selectedFormatId: stateMachine.selectedFormatId,
    result: stateMachine.result,
    error: stateMachine.error,
    isFFmpegLoaded: processor.isFFmpegLoaded,
    isFFmpegLoading: processor.isFFmpegLoading,
    isModelLoading: processor.isModelLoading,
    isModelLoaded: processor.isModelLoaded,
    isTranscribing: processor.isTranscribing,
    transcriptionProgress: processor.transcriptionProgress,
    currentModel: processor.currentModel,
    ffmpegMetrics: processor.ffmpegMetrics,
    memoryUsageMB,
    selectedModelKey,
    transcriptionMode,
    fastModeEnabled,
    processingStartTime: stateMachine.processingStartTime,
    processingEndTime: stateMachine.processingEndTime,
    onFileSelect: stateMachine.selectFile,
    onAction: handleAction,
    onDownload: handleDownload,
    onReset: handleReset,
    onModelSelect: handleModelSelect,
    onTranscribeFromDone: handleTranscribeFromDone,
    onWorkerConfigChange: handleWorkerConfigChange,
    onModeChange: setTranscriptionMode,
    onRetry: stateMachine.retry,
    hardware: hardwareCapability,
    largeFileBanner,
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-aura-canvas text-zinc-100">
      <div className="pointer-events-none fixed inset-0 mesh-minimal" aria-hidden />
      <NeuralNetBackground />
      <div
        className="pointer-events-none fixed inset-0 bg-[url('/aura-noise.svg')] opacity-[0.22] mix-blend-overlay [background-size:220px_220px]"
        aria-hidden
      />

      {/* ── FIXED OVERLAYS (outside contentRef so GSAP transforms don't clip them) ── */}
      <FontSelector />
      <ForgeProcessingOverlays
        state={stateMachine.state}
        currentAction={stateMachine.currentAction}
        selectedFormatId={stateMachine.selectedFormatId}
        transcriptionMode={transcriptionMode}
        fastModeEnabled={fastModeEnabled}
        fastTranscriber={fastTranscriber}
        processor={processor}
        onCancel={async () => { await processor.cancel(); stateMachine.cancelProcessing(); }}
        onNavigate={handleReset}
        cancelFastMode={fastTranscriber.cancel}
        cancelProcessing={stateMachine.cancelProcessing}
        isHighLoad={isHighLoad}
        onSwitchToFastMode={() => setTranscriptionMode("fast")}
      />

      {/* ── ANIMATED CONTENT ── */}
      <div className="relative z-10" ref={contentRef} style={{ transformStyle: "preserve-3d" }}>
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="mb-6">
            <ForgeTopBar currentState={stateMachine.state} onNavigate={handleReset} hardware={hardwareCapability} />
          </div>
          {getStateView(stateMachine.state).render(pageBag)}
        </div>
      </div>
    </main>
  );
}
