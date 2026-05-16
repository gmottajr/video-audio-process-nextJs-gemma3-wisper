"use client";

import type { AudioFormatConfig } from "@/utils/audioFormats";
import type { VideoFormatConfig } from "@/utils/videoFormats";

interface FormatDetailsCardProps {
  format: AudioFormatConfig | VideoFormatConfig;
  type: "audio" | "video";
  willRemux?: boolean;
}

export function FormatDetailsCard({ format, type, willRemux = false }: FormatDetailsCardProps) {
  const isVideo = type === "video";

  return (
    <div
      className="mb-5 p-4 rounded-xl"
      style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
    >
      <div className="grid grid-cols-2 gap-4 text-xs">
        {isVideo ? (
          <>
            <div>
              <p className="text-aura-muted mb-1">Video Codec</p>
              <p className="text-aura-text font-mono">{(format as VideoFormatConfig).videoCodec}</p>
            </div>
            <div>
              <p className="text-aura-muted mb-1">Audio Codec</p>
              <p className="text-aura-text font-mono">{(format as VideoFormatConfig).audioCodec}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-aura-muted mb-1">MIME Type</p>
              <p className="text-aura-text font-mono">{(format as AudioFormatConfig).mimeType}</p>
            </div>
            <div>
              <p className="text-aura-muted mb-1">Quality</p>
              <p className="text-aura-text">{(format as AudioFormatConfig).quality}</p>
            </div>
          </>
        )}
      </div>

      {willRemux && (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "oklch(66% 0.17 195 / 0.10)", border: "1px solid oklch(66% 0.17 195 / 0.30)" }}
        >
          <p className="font-jazz text-xs mb-1" style={{ color: "oklch(74% 0.13 195)" }}>
            Smart Remux Detected
          </p>
          <p className="text-xs text-aura-muted leading-relaxed">
            Your file already uses compatible codecs. This will be an instant container swap —
            no re-encoding, takes ~2 seconds instead of minutes.
          </p>
        </div>
      )}
    </div>
  );
}
