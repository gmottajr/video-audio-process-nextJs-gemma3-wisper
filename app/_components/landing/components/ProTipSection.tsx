import { Lightbulb } from "lucide-react";

export function ProTipSection() {
  return (
    <div className="section-viewport-center px-4 md:px-8">
      <div className="max-w-4xl mx-auto w-full">
        <div
          data-scroll-item
          className="rounded-2xl p-8"
          style={{
            background: "oklch(22% 0.025 280 / 0.70)",
            border: "1px solid oklch(72% 0.16 55 / 0.18)",
            boxShadow: "0 0 40px oklch(72% 0.16 55 / 0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Amber aurora wash */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 100% at 0% 0%, oklch(72% 0.16 55 / 0.08), transparent 70%)",
            }}
          />

          <div className="relative flex gap-5">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(72% 0.16 55 / 0.10)",
                border: "1px solid oklch(72% 0.16 55 / 0.24)",
              }}
            >
              <Lightbulb className="w-5 h-5" style={{ color: "var(--amber)" }} />
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <span
                  className="font-mono text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded"
                  style={{
                    background: "oklch(72% 0.16 55 / 0.08)",
                    border: "1px solid oklch(72% 0.16 55 / 0.28)",
                    color: "var(--amber)",
                  }}
                >
                  Pro Tip
                </span>
              </div>
              <h3 className="font-jazz mb-3" style={{ fontSize: 22, color: "var(--amber)" }}>
                Transcribe Specific Segments
              </h3>
              <p className="text-sm text-aura-muted leading-relaxed">
                Want to transcribe only part of a video? Select{" "}
                <strong className="text-aura-text font-semibold">&ldquo;Extract Audio&rdquo;</strong>{" "}
                first, then use the waveform viewer to select and transcribe specific sections.
                Perfect for long recordings — interviews, lectures, or live sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
