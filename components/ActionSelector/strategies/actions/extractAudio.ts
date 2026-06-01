import { detectFileType, getFormatById } from "@/utils/audioFormats";
import type { ActionStrategy, ActionPanelState, ButtonTextOpts } from "../../types";
import type { VideoMode } from "@/components/VideoModeTabs";
import { ExtractAudioPanel } from "../../components/ExtractAudioPanel";
import { register } from "./registry";

const strategy: ActionStrategy = {
  id: "extract",

  appliesTo(file: File, videoMode: VideoMode): boolean {
    return detectFileType(file) === "video" && videoMode === "extract";
  },

  buildOptions(file: File, state: ActionPanelState) {
    return {
      action: "extract" as const,
      formatId: state.selectedAudioFormat,
      options: {
        normalizeAudio: state.normalizeAudio,
        compressionType: state.compressionType,
      },
    };
  },

  isValid(_state: ActionPanelState, _isModelLoaded: boolean, _isModelLoading: boolean): boolean {
    return true;
  },

  getButtonText(state: ActionPanelState, _opts?: ButtonTextOpts): string {
    const hasCompression = state.compressionType !== "none";
    const hasNormalization = state.normalizeAudio;
    if (hasCompression && hasNormalization) return "Extract & Process Audio (Full Enhancement)";
    if (state.compressionType === "speech") return "Extract & Compress Audio (Speech)";
    if (state.compressionType === "studio") return "Extract & Compress Audio (Studio)";
    if (state.compressionType === "both") return "Extract & Enhance Audio (Full)";
    if (hasNormalization) return "Extract & Normalize Audio";
    return "Extract Audio";
  },

  getHintText(_state: ActionPanelState, _opts?: ButtonTextOpts & { willRemux?: boolean }): string {
    return "Processing happens in your browser via FFmpeg WebAssembly";
  },

  Panel: ExtractAudioPanel,
};

register(strategy);
export default strategy;
