"use client";

import { useEffect, useState } from "react";
import { WaveformViewer } from "@/components/WaveformViewer";

interface MediaPreviewProps {
  file: File;
  className?: string;
}

export function MediaPreview({ file, className }: MediaPreviewProps) {
  const [fileUrl, setFileUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  if (!fileUrl) return null;

  if (isVideo) {
    return (
      <div
        className={className}
        style={{
          background: "#000",
          border: "1px solid oklch(38% 0.02 280 / 0.35)",
          borderRadius: "0.75rem",
          overflow: "hidden",
          aspectRatio: "16 / 9",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          src={fileUrl}
          controls
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    );
  }

  if (isAudio) {
    return (
      <WaveformViewer
        audioUrl={fileUrl}
        selectable={true}
        className={className}
      />
    );
  }

  return null;
}
