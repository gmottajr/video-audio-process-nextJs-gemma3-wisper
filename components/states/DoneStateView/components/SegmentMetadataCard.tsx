"use client";

import { Scissors, X } from "lucide-react";
import { createSegmentMetadata, formatSegmentLabel } from "@/types/audioSegment";
import type { WaveformSelection } from "@/components/WaveformViewer";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

interface SegmentMetadataCardProps {
  file: File;
  selection: WaveformSelection;
  totalDuration: number;
  onClear: () => void;
}

export function SegmentMetadataCard({
  file,
  selection,
  totalDuration,
  onClear,
}: SegmentMetadataCardProps) {
  const metadata = createSegmentMetadata(file, selection.startTime, selection.endTime, totalDuration);

  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "rgba(34,211,238,0.15)",
            border: "1px solid rgba(34,211,238,0.3)",
            color: "#22d3ee",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Scissors className="w-4 h-4" />
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>
            Segment selected
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              color: "#8a8a9c",
              marginTop: 2,
              letterSpacing: "0.06em",
            }}
          >
            {formatSegmentLabel(metadata)}
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="flex items-center gap-1"
        style={{
          padding: "5px 9px",
          borderRadius: 6,
          fontSize: 11,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#8a8a9c",
          cursor: "pointer",
        }}
      >
        <X className="w-3 h-3" />
        Clear
      </button>
    </div>
  );
}
