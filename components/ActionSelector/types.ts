"use client";

import type { ComponentType } from "react";
import type { VideoMode } from "@/components/VideoModeTabs";
import type { WaveformSelection } from "@/components/WaveformViewer";
import type { ModelKey } from "@/components/ModelSelector";

export type ActionType = "extract" | "convert_audio" | "convert_video" | "transcribe";
export type CompressionType = "none" | "speech" | "studio" | "both";

export interface ActionOptions {
  resolutionId?: string;
  normalizeAudio?: boolean;
  compressionType?: CompressionType;
  segment?: { startTime: number; endTime: number };
  testMode?: boolean;
}

export interface ActionSelectorHandle {
  triggerAction: () => void;
}

export interface ActionSelectorProps {
  file: File;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  disabled: boolean;
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  selectedModelKey?: ModelKey;
  transcriptionMode?: "standard" | "fast";
  videoMode?: VideoMode;
  onVideoModeChange?: (mode: VideoMode) => void;
  hideInternalTabs?: boolean;
  hideHeader?: boolean;
  hideActionButton?: boolean;
  className?: string;
}

export interface ActionPanelState {
  selectedAudioFormat: string;
  selectedVideoFormat: string;
  selectedResolution: string;
  normalizeAudio: boolean;
  compressionType: CompressionType;
  waveformSelection: WaveformSelection | null;
  audioDuration: number;
}

export interface ActionPanelProps {
  file: File;
  state: ActionPanelState;
  onStateChange: (patch: Partial<ActionPanelState>) => void;
  disabled: boolean;
  transcriptionMode?: "standard" | "fast";
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  selectedModelKey?: ModelKey;
  audioUrl?: string | null;
}

export interface ButtonTextOpts {
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  selectedFormatName?: string;
}

export interface ActionStrategy {
  id: ActionType;
  appliesTo(file: File, videoMode: VideoMode): boolean;
  buildOptions(
    file: File,
    state: ActionPanelState,
  ): { action: ActionType; formatId: string; options: ActionOptions };
  isValid(
    state: ActionPanelState,
    isModelLoaded: boolean,
    isModelLoading: boolean,
  ): boolean;
  getButtonText(state: ActionPanelState, opts?: ButtonTextOpts): string;
  getHintText(state: ActionPanelState, opts?: ButtonTextOpts & { willRemux?: boolean }): string;
  Panel: ComponentType<ActionPanelProps>;
}
