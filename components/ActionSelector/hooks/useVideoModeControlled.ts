import { useState } from "react";
import type { VideoMode } from "@/components/VideoModeTabs";

export function useVideoModeControlled(
  videoModeProp: VideoMode | undefined,
  onVideoModeChange: ((mode: VideoMode) => void) | undefined,
) {
  const [internalVideoMode, setInternalVideoMode] = useState<VideoMode>("extract");
  const videoMode = videoModeProp ?? internalVideoMode;
  const setVideoMode = (m: VideoMode) => {
    if (onVideoModeChange) onVideoModeChange(m);
    else setInternalVideoMode(m);
  };
  return { videoMode, setVideoMode };
}
