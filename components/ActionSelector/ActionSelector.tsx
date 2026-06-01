"use client";

import { forwardRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";
import { detectFileType, getFormatById } from "@/utils/audioFormats";
import { canRemux, getVideoFormatById } from "@/utils/videoFormats";
import { VideoModeTabs } from "@/components/VideoModeTabs";
import { ProgressButton } from "@/components/ProgressButton";
import { useVideoModeControlled } from "./hooks/useVideoModeControlled";
import { useImperativeActionHandle } from "./hooks/useImperativeActionHandle";
import { useActionPanelState } from "./hooks/useActionPanelState";
import { getAvailableStrategy, getActionStrategy } from "./strategies/actions/registry";
import { ActionHeader } from "./components/ActionHeader";
import { SecondaryTranscribeSection } from "./components/SecondaryTranscribeSection";
import type { ActionSelectorHandle, ActionSelectorProps, ActionPanelProps } from "./types";

export const ActionSelector = forwardRef<ActionSelectorHandle, ActionSelectorProps>(
  function ActionSelector(props, ref) {
    const {
      file,
      onAction,
      disabled,
      isModelLoading = false,
      isModelLoaded = false,
      modelLoadingProgress = 0,
      selectedModelKey = "base",
      transcriptionMode = "standard",
      hideInternalTabs = false,
      hideHeader = false,
      hideActionButton = false,
      className,
    } = props;

    const { videoMode, setVideoMode } = useVideoModeControlled(props.videoMode, props.onVideoModeChange);
    const { state, patch, audioUrl } = useActionPanelState(file, transcriptionMode);

    const fileType = detectFileType(file);
    const strategy = getAvailableStrategy(file, videoMode);

    const handleStart = useCallback(() => {
      if (!strategy || disabled) return;
      if (!strategy.isValid(state, isModelLoaded, isModelLoading)) return;
      const { action, formatId, options } = strategy.buildOptions(file, state);
      onAction(action, formatId, options);
    }, [strategy, disabled, state, isModelLoaded, isModelLoading, file, onAction]);

    useImperativeActionHandle(ref, handleStart);

    const handleTranscribeAudio = useCallback(() => {
      if (disabled || !isModelLoaded || isModelLoading) return;
      const transcribeStrategy = getActionStrategy("transcribe");
      const { action, formatId, options } = transcribeStrategy.buildOptions(file, state);
      onAction(action, formatId, options);
    }, [disabled, isModelLoaded, isModelLoading, file, state, onAction]);

    if (fileType === "unknown") {
      return (
        <div className={cn("rounded-xl p-6", className)} style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}>
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(30% 0.08 25 / 0.40)", border: "1px solid oklch(55% 0.18 25 / 0.30)" }}>
              <AlertTriangle className="w-7 h-7" style={{ color: "oklch(70% 0.14 25)" }} />
            </div>
            <h3 className="font-jazz text-lg mb-2 text-aura-text">Unsupported File Type</h3>
            <p className="text-sm text-aura-muted mb-2">This file type is not recognized as video or audio.</p>
            <p className="text-xs text-aura-muted opacity-60 font-mono">MP4 · AVI · MOV · MKV · WebM · MP3 · WAV · AAC · OGG</p>
          </div>
        </div>
      );
    }

    const willRemux =
      fileType === "video" &&
      videoMode === "convert" &&
      state.selectedResolution === "original" &&
      canRemux(file, state.selectedVideoFormat);

    const selectedFormatName =
      fileType === "audio" || videoMode === "extract"
        ? (getFormatById(state.selectedAudioFormat)?.name ?? "")
        : (getVideoFormatById(state.selectedVideoFormat)?.name ?? "");

    const modelOpts = { isModelLoading, isModelLoaded, modelLoadingProgress, selectedFormatName };

    const panelProps: ActionPanelProps = {
      file,
      state,
      onStateChange: patch,
      disabled,
      transcriptionMode,
      isModelLoading,
      isModelLoaded,
      modelLoadingProgress,
      selectedModelKey,
      audioUrl,
    };

    return (
      <div className={cn("rounded-xl p-5", className)} style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)", backdropFilter: "blur(8px)" }}>
        {!hideHeader && <ActionHeader fileType={fileType} videoMode={videoMode} />}

        {fileType === "video" && !hideInternalTabs && (
          <VideoModeTabs selectedMode={videoMode} onModeChange={setVideoMode} />
        )}

        {strategy && <strategy.Panel {...panelProps} />}

        {!hideActionButton && strategy && (
          <>
            <ProgressButton
              onClick={handleStart}
              disabled={disabled || !strategy.isValid(state, isModelLoaded, isModelLoading)}
              isLoading={videoMode === "transcribe" && isModelLoading}
              progress={modelLoadingProgress}
              variant={videoMode === "transcribe" ? "transcribe" : "primary"}
              icon={videoMode === "transcribe" ? "brain" : "play"}
              size="large"
            >
              {strategy.getButtonText(state, modelOpts)}
            </ProgressButton>
            <p className="mt-4 text-xs text-center text-aura-muted">
              {strategy.getHintText(state, { ...modelOpts, willRemux })}
            </p>
          </>
        )}

        {!hideActionButton && (fileType === "audio" || (fileType === "video" && videoMode !== "transcribe")) && (
          <SecondaryTranscribeSection
            file={file}
            fileType={fileType}
            state={state}
            disabled={disabled}
            isModelLoading={isModelLoading}
            isModelLoaded={isModelLoaded}
            modelLoadingProgress={modelLoadingProgress}
            selectedModelKey={selectedModelKey}
            onTranscribe={handleTranscribeAudio}
          />
        )}
      </div>
    );
  },
);
