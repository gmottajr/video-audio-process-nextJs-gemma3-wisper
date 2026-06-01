"use client";

import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const eyebrow: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a8a9c",
};

interface FileMetaCardProps {
  result: ProcessingResult;
  metrics: any;
  file: File;
  memoryUsageMB: number;
}

export function FileMetaCard({ result, metrics, file, memoryUsageMB }: FileMetaCardProps) {
  return (
    <div className="mt-6">
      <div style={{ ...eyebrow, marginBottom: 10 }}>File Information</div>
      <MetadataDisplay metrics={metrics} file={file} />

      {result.metadata &&
        (result.metadata.compressionType || result.metadata.normalized !== undefined) && (
          <div
            className="mt-4"
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#1b1b28",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ ...eyebrow, marginBottom: 10 }}>Processing Applied</div>
            <dl className="grid grid-cols-2 gap-3" style={{ fontSize: 13 }}>
              {result.metadata.compressionType && result.metadata.compressionType !== "none" && (
                <div>
                  <dt style={{ color: "#5b5b6e", fontSize: 11, marginBottom: 2 }}>
                    Audio compression
                  </dt>
                  <dd style={{ fontWeight: 500 }}>
                    {result.metadata.compressionType === "speech" ? (
                      <span style={{ color: "#34d399" }}>🎙️ Speech optimized</span>
                    ) : result.metadata.compressionType === "studio" ? (
                      <span style={{ color: "#67e8f9" }}>🎚️ Studio quality</span>
                    ) : (
                      <span style={{ color: "#c4b5fd" }}>✨ Full enhancement</span>
                    )}
                  </dd>
                </div>
              )}
              {result.metadata.normalized !== undefined && (
                <div>
                  <dt style={{ color: "#5b5b6e", fontSize: 11, marginBottom: 2 }}>
                    Audio normalization
                  </dt>
                  <dd style={{ fontWeight: 500 }}>
                    {result.metadata.normalized ? (
                      <span style={{ color: "#34d399" }}>✓ Applied</span>
                    ) : (
                      <span style={{ color: "#8a8a9c" }}>✗ Not applied</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

      <details className="mt-6">
        <summary
          className="cursor-pointer transition-colors hover:text-white"
          style={{
            ...eyebrow,
            color: "#8a8a9c",
            listStyle: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ▸ View processing stats
        </summary>
        <div className="mt-4">
          <ResourceMonitor metrics={metrics} memoryUsageMB={memoryUsageMB} progress={100} />
        </div>
      </details>
    </div>
  );
}
