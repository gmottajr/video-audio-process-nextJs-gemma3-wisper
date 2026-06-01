import { detectFileType, getFormatById } from "@/utils/audioFormats";
import type { ActionStrategy, ActionPanelState, ButtonTextOpts } from "../../types";
import type { VideoMode } from "@/components/VideoModeTabs";
import { ConvertAudioPanel } from "../../components/ConvertAudioPanel";
import { register } from "./registry";

const strategy: ActionStrategy = {
  id: "convert_audio",

  appliesTo(file: File, videoMode: VideoMode): boolean {
    return detectFileType(file) === "audio" && videoMode !== "transcribe";
  },

  buildOptions(file: File, state: ActionPanelState) {
    const segment = state.waveformSelection
      ? { startTime: state.waveformSelection.startTime, endTime: state.waveformSelection.endTime }
      : undefined;
    return {
      action: "convert_audio" as const,
      formatId: state.selectedAudioFormat,
      options: {
        normalizeAudio: state.normalizeAudio,
        compressionType: state.compressionType,
        segment,
      },
    };
  },

  isValid(_state: ActionPanelState, _isModelLoaded: boolean, _isModelLoading: boolean): boolean {
    return true;
  },

  getButtonText(state: ActionPanelState, opts?: ButtonTextOpts): string {
    const hasCompression = state.compressionType !== "none";
    const hasNormalization = state.normalizeAudio;
    const formatName = opts?.selectedFormatName ?? getFormatById(state.selectedAudioFormat)?.name ?? "";
    const segSuffix = state.waveformSelection ? " Segment" : "";

    if (hasCompression && hasNormalization) return `Normalize & Convert${segSuffix} to ${formatName}`;
    if (state.compressionType === "speech") return `Compress & Convert${segSuffix} to ${formatName}`;
    if (state.compressionType === "studio") return `Compress & Convert${segSuffix} to ${formatName}`;
    if (state.compressionType === "both") return `Enhance & Convert${segSuffix} to ${formatName}`;
    if (hasNormalization) return `Normalize & Convert${segSuffix} to ${formatName}`;
    return `Convert${segSuffix} to ${formatName}`;
  },

  getHintText(_state: ActionPanelState, _opts?: ButtonTextOpts & { willRemux?: boolean }): string {
    return "Processing happens in your browser via FFmpeg WebAssembly";
  },

  Panel: ConvertAudioPanel,
};

register(strategy);
export default strategy;
