"use client";

import Link from "next/link";
import { ChevronRight, Headphones, Lock } from "lucide-react";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";

export function HeroSection() {
  return (
    <div className="section-viewport-center text-center px-4 pb-8">
      {/* Per-section aurora wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 20%, oklch(60% 0.20 290 / 0.13), transparent 65%)",
        }}
      />

      {/* Privacy pill */}
      <div
        data-scroll-item
        className="relative mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm"
        style={{
          border: "1px solid oklch(66% 0.17 195 / 0.22)",
          background: "oklch(66% 0.17 195 / 0.06)",
          color: "var(--teal)",
        }}
      >
        <Lock className="w-3 h-3" />
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
          100% Private &amp; Offline — Files Never Leave Your Device
        </span>
      </div>

      {/* Headline */}
      <div data-scroll-item className="relative mb-4">
        <div className="font-mono text-[12px] tracking-[0.22em] uppercase text-aura-muted mb-3.5">
          Browser-Native Media Forge
        </div>
        <h1
          className="font-display tracking-tight leading-none text-aura-text"
          style={{ fontSize: "clamp(52px, 8vw, 92px)", fontWeight: 700 }}
        >
          Neural Groove
        </h1>
        <div
          className="font-display mt-2"
          style={{
            fontSize: "clamp(20px, 3vw, 34px)",
            color: "var(--violet)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          Spectrum Divergent
        </div>
      </div>

      {/* Tagline */}
      <p data-scroll-item className="relative text-base md:text-lg text-aura-muted max-w-lg leading-relaxed mt-1">
        Video processing, audio conversion &amp; AI transcription.{" "}
        <span className="font-medium" style={{ color: "var(--teal)" }}>Zero uploads. Zero traces.</span>
      </p>

      {/* CTAs */}
      <div data-scroll-item className="relative flex flex-wrap items-center justify-center gap-4 mt-8">
        <Link
          href="/forge"
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.03]"
          style={{ background: "var(--violet)", boxShadow: "0 8px 32px oklch(60% 0.20 290 / 0.30)" }}
        >
          Start Processing
          <ChevronRight className="w-4 h-4" />
        </Link>
        <button
          onClick={() => window.scrollTo({ top: 4 * window.innerHeight, behavior: "smooth" })}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
          style={{ color: "var(--text)", border: "1px solid var(--border)", background: "transparent" }}
        >
          <Headphones className="w-4 h-4" style={{ color: "var(--amber)" }} />
          Explore the Music
        </button>
      </div>

      {/* Waveform */}
      <div data-scroll-item className="relative mt-10 w-full max-w-2xl px-4 opacity-75">
        <WaveformVisualizer height={64} />
      </div>
    </div>
  );
}
