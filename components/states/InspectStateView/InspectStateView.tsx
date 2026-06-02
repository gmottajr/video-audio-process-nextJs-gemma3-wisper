"use client";

import { useRef, useMemo, useCallback } from "react";
import {
  ActionSelector,
  type ActionSelectorHandle,
} from "@/components/ActionSelector";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { InspectStateViewProps } from "./types";
import { getFileKindStrategy } from "./strategies/fileKind/registry";
import { resolveCtaLabel } from "./services/capabilityRecommender";
import { useDetectedCapabilities } from "./hooks/useDetectedCapabilities";
import { useWorkerConfig } from "./hooks/useWorkerConfig";
import { useActionTileState } from "./hooks/useActionTileState";
import { useFloatingBarShortcuts } from "./hooks/useFloatingBarShortcuts";
import { FileStrip } from "./components/FileStrip";
import { FFmpegBanner } from "./components/FFmpegBanner";
import { WorkerErrorBanner } from "./components/WorkerErrorBanner";
import { Card } from "./components/Card";
import { CardHeader } from "./components/CardHeader";
import { StepTitle } from "./components/StepTitle";
import { ActionTiles } from "./components/ActionTiles";
import { TranscriptionModeTiles } from "./components/TranscriptionModeTiles";
import { ModelTilesGrid } from "./components/ModelTilesGrid";
import { CapabilityStatTiles } from "./components/CapabilityStatTiles";
import { GpuAccelerationRow } from "./components/GpuAccelerationRow";
import { InferenceDeviceControl } from "./components/InferenceDeviceControl";
import { WorkerCountSlider } from "./components/WorkerCountSlider";
import { PreviewPane } from "./components/PreviewPane";
import { FloatingActionBar } from "./components/FloatingActionBar";

export function InspectStateView({
  file,
  metrics,
  selectedModelKey,
  currentModel,
  isModelLoading,
  isTranscribing,
  onModelSelect,
  transcriptionMode,
  onModeChange,
  onWorkerConfigChange,
  onAction,
  onBack,
  isFFmpegLoaded,
  isFFmpegLoading = false,
  isModelLoaded,
  modelLoadingProgress,
  transcriptionError = null,
  onRetryWorker,
}: InspectStateViewProps) {
  const fastModeEnabled = isFeatureEnabled("ENABLE_FAST_MODE");
  const kindStrategy = getFileKindStrategy(file);
  const kind = kindStrategy.kind;

  const { actionTile, setActionTile } = useActionTileState(kind);
  const { caps } = useDetectedCapabilities();
  const { workerCount, setWorkerCount, devicePreference, setDevicePreference, useGPU } =
    useWorkerConfig(caps, onWorkerConfigChange);

  const actionRef = useRef<ActionSelectorHandle>(null);
  const triggerAction = useCallback(() => actionRef.current?.triggerAction(), []);

  useFloatingBarShortcuts({ isTranscribing, onBack, triggerAction });

  const isTranscribeTile = actionTile === "transcribe";
  const ctaLabel = useMemo(
    () => resolveCtaLabel(actionTile, transcriptionMode, kind),
    [actionTile, transcriptionMode, kind]
  );
  const ctaDisabled =
    !isFFmpegLoaded ||
    isTranscribing ||
    (isTranscribeTile &&
      transcriptionMode !== "fast" &&
      (!isModelLoaded || isModelLoading));

  return (
    <div className="animate-in fade-in duration-500 max-w-[1480px] mx-auto px-4 pb-24">
      <FileStrip file={file} kindStrategy={kindStrategy} onBack={onBack} />

      {transcriptionError && (
        <WorkerErrorBanner error={transcriptionError} onRetry={onRetryWorker} />
      )}

      <FFmpegBanner isFFmpegLoaded={isFFmpegLoaded} isFFmpegLoading={isFFmpegLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* ── LEFT column ── */}
        <div className="flex flex-col gap-5 min-w-0">
          {kind !== "unknown" && (
            <Card>
              <StepTitle text="Step 02 · Choose action" />
              <ActionTiles
                kind={kind as "video" | "audio"}
                value={actionTile}
                onChange={setActionTile}
                disabled={!isFFmpegLoaded || isTranscribing}
              />
            </Card>
          )}

          <ActionSelector
            ref={actionRef}
            file={file}
            onAction={onAction}
            disabled={!isFFmpegLoaded || isTranscribing}
            isModelLoading={isModelLoading}
            isModelLoaded={isModelLoaded}
            modelLoadingProgress={modelLoadingProgress}
            selectedModelKey={transcriptionMode === "fast" ? "distil-small" : selectedModelKey}
            transcriptionMode={transcriptionMode}
            videoMode={actionTile}
            onVideoModeChange={setActionTile}
            hideInternalTabs
            hideHeader
            hideActionButton
          />

          {fastModeEnabled && (
            <TranscriptionModeTiles
              selected={transcriptionMode}
              onSelect={onModeChange}
              disabled={isTranscribing}
              dimmed={!isTranscribeTile}
            />
          )}

          <ModelTilesGrid
            selected={transcriptionMode === "fast" ? "distil-small" : selectedModelKey}
            currentlyLoaded={currentModel}
            onSelect={onModelSelect}
            fastMode={transcriptionMode === "fast"}
            disabled={isTranscribing || isModelLoading}
            dimmed={!isTranscribeTile}
          />
        </div>

        {/* ── RIGHT column ── */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card>
            <CardHeader title="System capabilities" />
            <CapabilityStatTiles
              caps={caps}
              workers={workerCount || caps?.recommendedWorkers || 0}
            />
            <GpuAccelerationRow caps={caps} />
            <div className="mt-4">
              <InferenceDeviceControl
                caps={caps}
                value={devicePreference}
                onChange={setDevicePreference}
              />
            </div>
            <div className="mt-4">
              <WorkerCountSlider
                caps={caps}
                value={workerCount || caps?.recommendedWorkers || 2}
                onChange={setWorkerCount}
                useGPU={useGPU}
              />
            </div>
          </Card>

          <PreviewPane file={file} />

          <Card>
            <CardHeader title="File information" />
            <div className="-mx-1">
              <MetadataDisplay metrics={metrics} file={file} variant="compact" />
            </div>
          </Card>
        </div>
      </div>

      <FloatingActionBar
        label={ctaLabel}
        onCta={triggerAction}
        ctaDisabled={ctaDisabled}
      />
    </div>
  );
}
