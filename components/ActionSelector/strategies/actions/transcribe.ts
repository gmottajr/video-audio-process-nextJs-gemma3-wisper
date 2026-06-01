import type { ActionStrategy, ActionPanelState, ButtonTextOpts } from "../../types";
import type { VideoMode } from "@/components/VideoModeTabs";
import { TranscribePanel } from "../../components/TranscribePanel";
import { register } from "./registry";

const strategy: ActionStrategy = {
  id: "transcribe",

  appliesTo(_file: File, videoMode: VideoMode): boolean {
    return videoMode === "transcribe";
  },

  buildOptions(file: File, state: ActionPanelState) {
    const segment = state.waveformSelection
      ? { startTime: state.waveformSelection.startTime, endTime: state.waveformSelection.endTime }
      : undefined;
    return {
      action: "transcribe" as const,
      formatId: "",
      options: {
        normalizeAudio: state.normalizeAudio,
        compressionType: state.compressionType,
        segment,
      },
    };
  },

  isValid(_state: ActionPanelState, isModelLoaded: boolean, isModelLoading: boolean): boolean {
    return isModelLoaded && !isModelLoading;
  },

  getButtonText(_state: ActionPanelState, opts?: ButtonTextOpts): string {
    const progress = Math.round(opts?.modelLoadingProgress ?? 0);
    if (opts?.isModelLoading) return `Loading AI Model... ${progress}%`;
    if (!opts?.isModelLoaded) return "Waiting for Model...";

    const hasCompression = _state.compressionType !== "none";
    const hasNormalization = _state.normalizeAudio;
    if (hasCompression && hasNormalization) return "Transcribe (Enhanced Audio)";
    if (_state.compressionType === "speech") return "Transcribe (Speech Compressed)";
    if (_state.compressionType === "studio") return "Transcribe (Studio Compressed)";
    if (_state.compressionType === "both") return "Transcribe (Full Enhancement)";
    if (hasNormalization) return "Transcribe (Normalized Audio)";
    return "Start AI Transcription";
  },

  getHintText(_state: ActionPanelState, opts?: ButtonTextOpts & { willRemux?: boolean }): string {
    const progress = Math.round(opts?.modelLoadingProgress ?? 0);
    if (opts?.isModelLoading) return `AI model loading… ${progress}%`;
    if (!opts?.isModelLoaded) return "Waiting for AI model to start loading…";

    const hasEnhancements = _state.normalizeAudio || _state.compressionType !== "none";
    if (hasEnhancements) return "Model ready · Audio will be enhanced before transcription";
    return "Model ready · Word-level timestamps · Export as TXT / JSON / SRT";
  },

  Panel: TranscribePanel,
};

register(strategy);
export default strategy;
