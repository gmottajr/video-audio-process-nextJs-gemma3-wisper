"use client";

import type { AudioFormatConfig } from "@/utils/audioFormats";
import type { VideoFormatConfig } from "@/utils/videoFormats";

interface FormatDetailsCardProps {
  format: AudioFormatConfig | VideoFormatConfig;
  type: "audio" | "video";
  willRemux?: boolean;
}

export function FormatDetailsCard({
  format,
  type,
  willRemux = false,
}: FormatDetailsCardProps) {
  const isVideo = type === "video";

  return (
    <div className="mb-6 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
      <div className="grid grid-cols-2 gap-4 text-xs">
        {isVideo ? (
          <>
            <div>
              <div className="text-zinc-500 mb-1">Video Codec</div>
              <div className="text-zinc-300 font-mono">
                {(format as VideoFormatConfig).videoCodec}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Audio Codec</div>
              <div className="text-zinc-300 font-mono">
                {(format as VideoFormatConfig).audioCodec}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-zinc-500 mb-1">MIME Type</div>
              <div className="text-zinc-300 font-mono">
                {(format as AudioFormatConfig).mimeType}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Quality</div>
              <div className="text-zinc-300">
                {(format as AudioFormatConfig).quality}
              </div>
            </div>
          </>
        )}
      </div>
      
      {willRemux && (
        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-950/50 to-orange-950/50 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
            <span>⚡</span>
            <span>SMART REMUX DETECTED</span>
          </div>
          <p className="text-xs text-yellow-300">
            Your file already uses compatible codecs. This will be an instant container swap
            (no re-encoding) - takes ~2 seconds instead of minutes!
          </p>
        </div>
      )}
    </div>
  );
}

