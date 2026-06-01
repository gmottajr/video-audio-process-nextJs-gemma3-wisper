"use client";

import { useState, useEffect } from "react";
import { MediaPreview } from "@/components/MediaPreview";
import { SECTION_LABEL } from "../types";

export function PreviewPane({ file }: { file: File }) {
  const [duration, setDuration] = useState<string>("--:--");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isVideo && !isAudio) return;
    const el = isVideo
      ? document.createElement("video")
      : document.createElement("audio");
    el.preload = "metadata";
    el.src = url;
    const handler = () => {
      const total = el.duration;
      if (!isFinite(total)) return;
      const mm = Math.floor(total / 60);
      const ss = Math.floor(total % 60);
      setDuration(
        `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      );
    };
    el.addEventListener("loadedmetadata", handler);
    return () => {
      el.removeEventListener("loadedmetadata", handler);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "oklch(22% 0.025 280 / 0.55)",
        border: "1px solid oklch(38% 0.02 280 / 0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid oklch(38% 0.02 280 / 0.35)" }}
      >
        <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
          Preview
        </div>
        <div
          className="font-mono text-[10.5px] tracking-[0.06em]"
          style={{ color: "var(--text-muted)" }}
        >
          00:00 / {duration}
        </div>
      </div>
      <div className="p-2">
        <MediaPreview file={file} />
      </div>
    </div>
  );
}
