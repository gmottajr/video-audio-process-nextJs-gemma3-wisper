"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NeuralNetBackground } from "@/components/NeuralNetBackground";
import { ScrollScene } from "@/components/ScrollScene";
import { pickPageTransition } from "@/lib/pageTransition";

const VIDEOS = [
  { id: "sNMBCWld1h4", title: "Neural Groove · Spectrum Divergent" },
  { id: "GbFAbW8HBgA", title: "Neural Groove · Spectrum Divergent" },
  { id: "Vs7FboYqZRo", title: "Neural Groove · Spectrum Divergent" },
];

// ── NAV ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-aura-border backdrop-blur-sm bg-aura-canvas/50">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/branding/NeuralGrooveIcon.png" alt="Neural Groove" width={36} height={36} className="rounded-lg" />
        <span className="font-tchaikovsky tracking-[0.12em] text-sm">Neural Groove</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/" className="px-4 py-2 rounded-lg text-sm text-aura-muted hover:text-aura-text transition-colors">
          Home
        </Link>
        <Link
          href="/forge"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 text-white"
          style={{ background: "var(--violet)" }}
        >
          Launch Forge
        </Link>
      </div>
    </nav>
  );
}

// ── SECTION 0: HEADER ────────────────────────────────────────────────────────

function HeaderSection() {
  return (
    <div className="section-viewport-center text-center px-4">
      <p data-scroll-item className="text-xs font-mono tracking-[0.20em] uppercase text-aura-muted mb-6">
        Neural Groove · Spectrum Divergent
      </p>
      <h1 data-scroll-item className="font-jazz text-6xl md:text-7xl text-aura-text mb-4">
        The Music
      </h1>
      <p data-scroll-item className="text-aura-muted text-base max-w-lg mx-auto leading-relaxed mb-10">
        Original compositions exploring the intersection of neural complexity and musical emotion.
      </p>
      <button
        data-scroll-item
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03]"
        style={{ background: "var(--violet)", color: "white" }}
      >
        Watch Now ↓
      </button>
    </div>
  );
}

// ── SECTIONS 1-3: VIDEOS ─────────────────────────────────────────────────────

function VideoSection({ video, index }: { video: { id: string; title: string }; index: number }) {
  return (
    <div className="section-viewport-center px-4 md:px-8">
      <div className="w-full max-w-3xl mx-auto">
        <p data-scroll-item className="text-xs font-mono tracking-[0.16em] uppercase text-aura-muted text-center mb-4">
          Track {index + 1} of {VIDEOS.length}
        </p>
        <div
          data-scroll-item
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: "oklch(24% 0.025 280 / 0.70)",
            border: "1px solid oklch(38% 0.02 280 / 0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${video.id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <h3 className="font-chaotic text-sm text-aura-text leading-snug">{video.title}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

export default function MusicPage() {
  const [transitionType] = useState(() => pickPageTransition());

  const sections = [
    <HeaderSection key="header" />,
    ...VIDEOS.map((video, i) => <VideoSection key={video.id} video={video} index={i} />),
  ];

  return (
    <main className="relative isolate bg-aura-canvas text-aura-text font-sans">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0 bg-aura-radial animate-glow-breathe" aria-hidden />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="animate-aurora-sweep absolute" style={{ top: "-8%", right: "-10%", width: "1000px", height: "1000px" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(148,68,255,0.95) 0%, rgba(98,28,255,0.48) 40%, transparent 72%)", filter: "blur(34px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(228,48,198,0.92) 0%, rgba(180,20,160,0.44) 40%, transparent 72%)", filter: "blur(34px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(0,220,235,0.88) 0%, rgba(0,160,180,0.40) 40%, transparent 72%)", filter: "blur(34px)" }} />
        </div>
        <div className="animate-aurora-2 animate-core-pulse absolute" style={{ top: "5%", right: "9%", width: "320px", height: "320px" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(148,68,255,1.0) 0%, rgba(148,68,255,0.50) 50%, transparent 70%)", filter: "blur(12px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(228,48,198,0.98) 0%, rgba(228,48,198,0.46) 50%, transparent 70%)", filter: "blur(12px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(38,128,255,0.95) 0%, rgba(38,128,255,0.42) 50%, transparent 70%)", filter: "blur(12px)" }} />
        </div>
        <div className="animate-aurora-1 absolute" style={{ top: "-15%", left: "-10%", width: "860px", height: "760px" }}>
          <div className="orb-layer-a-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(148,68,255,0.80) 0%, rgba(98,28,255,0.36) 50%, transparent 72%)", filter: "blur(44px)" }} />
          <div className="orb-layer-b-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(228,48,198,0.65) 0%, rgba(180,20,160,0.26) 50%, transparent 72%)", filter: "blur(44px)" }} />
          <div className="orb-layer-c-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(38,128,255,0.56) 0%, rgba(20,80,200,0.22) 50%, transparent 72%)", filter: "blur(44px)" }} />
        </div>
        <div className="animate-aurora-3 absolute" style={{ bottom: "-10%", left: "18%", width: "1000px", height: "500px" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(0,220,235,0.70) 0%, rgba(0,160,180,0.30) 50%, transparent 72%)", filter: "blur(48px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(228,48,198,0.65) 0%, rgba(180,20,160,0.26) 50%, transparent 72%)", filter: "blur(48px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(148,68,255,0.60) 0%, rgba(98,28,255,0.22) 50%, transparent 72%)", filter: "blur(48px)" }} />
        </div>
      </div>
      <NeuralNetBackground />
      <div className="pointer-events-none fixed inset-0 bg-[url('/aura-noise.svg')] opacity-[0.22] mix-blend-overlay [background-size:220px_220px]" aria-hidden />

      <ScrollScene nav={<Nav />} sections={sections} transitionType={transitionType} />
    </main>
  );
}
