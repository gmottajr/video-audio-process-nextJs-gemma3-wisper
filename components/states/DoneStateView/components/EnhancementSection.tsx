"use client";

import { Sparkles } from "lucide-react";
import { EnhancementToggle } from "@/components/EnhancementToggle";

const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

interface EnhancementSectionProps {
  enhancer: any;
  enhancementEnabled: boolean;
  handleEnhancementToggle: (enabled: boolean) => Promise<void>;
}

export function EnhancementSection({
  enhancer,
  enhancementEnabled,
  handleEnhancementToggle,
}: EnhancementSectionProps) {
  if (!enhancer) return null;

  return (
    <>
      {enhancer.capabilities && !enhancer.isCheckingHardware && (
        <div className="mt-4">
          <EnhancementToggle
            capabilities={enhancer.capabilities}
            enabled={enhancementEnabled}
            onToggle={handleEnhancementToggle}
            disabled={enhancer.isEnhancing || enhancer.isModelLoading}
            isModelLoaded={enhancer.isModelLoaded}
            isModelLoading={enhancer.isModelLoading}
          />
        </div>
      )}

      {enhancer.isEnhancing && enhancer.progress && (
        <div
          className="mt-4"
          style={{
            padding: 16,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.02))",
            border: "1px solid rgba(139,92,246,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: "#a78bfa" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "#c4b5fd" }}>
                AI Enhancement in progress
              </span>
            </div>
            <span
              style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#c4b5fd", fontWeight: 600 }}
            >
              {enhancer.progress.progress}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#232333", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${enhancer.progress.progress}%`,
                background: "linear-gradient(90deg, #8b5cf6, #c084fc)",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
          <p className="mt-2" style={{ fontSize: 11, color: "#8a8a9c" }}>
            {enhancer.progress.message || "Processing..."}
          </p>
        </div>
      )}

      {enhancer.isModelLoading && (
        <div
          className="mt-4"
          style={{
            padding: 16,
            borderRadius: 12,
            background: "rgba(34,211,238,0.06)",
            border: "1px solid rgba(34,211,238,0.25)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 animate-spin" style={{ color: "#67e8f9" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "#67e8f9" }}>
              Loading AI Enhancement model
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#232333", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: "33%",
                background: "linear-gradient(90deg, #22d3ee, #67e8f9)",
              }}
              className="animate-pulse"
            />
          </div>
          <p className="mt-2" style={{ fontSize: 11, color: "#8a8a9c" }}>
            First-time download may take 2–5 minutes…
          </p>
        </div>
      )}

      {enhancer.error && (
        <div
          className="mt-4"
          style={{
            padding: 14,
            borderRadius: 10,
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <p style={{ fontSize: 13, color: "#fca5a5" }}>
            ❌ Enhancement failed: {enhancer.error}
          </p>
        </div>
      )}
    </>
  );
}
