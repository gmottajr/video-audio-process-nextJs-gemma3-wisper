import { detectFileType } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ActionStrategy, ActionPanelState, ButtonTextOpts } from "../../types";
import type { VideoMode } from "@/components/VideoModeTabs";
import { ConvertVideoPanel } from "../../components/ConvertVideoPanel";
import { register } from "./registry";

const strategy: ActionStrategy = {
  id: "convert_video",

  appliesTo(file: File, videoMode: VideoMode): boolean {
    return detectFileType(file) === "video" && videoMode === "convert";
  },

  buildOptions(_file: File, state: ActionPanelState) {
    return {
      action: "convert_video" as const,
      formatId: state.selectedVideoFormat,
      options: {
        resolutionId: state.selectedResolution,
      },
    };
  },

  isValid(_state: ActionPanelState, _isModelLoaded: boolean, _isModelLoading: boolean): boolean {
    return true;
  },

  getButtonText(state: ActionPanelState, opts?: ButtonTextOpts): string {
    const formatName = opts?.selectedFormatName ?? getVideoFormatById(state.selectedVideoFormat)?.name ?? state.selectedVideoFormat;
    return `Convert to ${formatName}`;
  },

  getHintText(_state: ActionPanelState, opts?: ButtonTextOpts & { willRemux?: boolean }): string {
    if (opts?.willRemux) return "Instant — remux only, no re-encoding";
    return "Processing happens in your browser via FFmpeg WebAssembly";
  },

  Panel: ConvertVideoPanel,
};

register(strategy);
export default strategy;
