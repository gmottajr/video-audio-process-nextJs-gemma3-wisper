"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Headphones,
  Video,
  Music,
  Mic,
  Lock,
  Shield,
  WifiOff,
  Database,
  Cpu,
  Lightbulb,
  Zap,
} from "lucide-react";
import { NeuralNetBackground } from "@/components/NeuralNetBackground";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { ScrollScene } from "@/components/ScrollScene";
import { pickPageTransition } from "@/lib/pageTransition";

// ── DATA ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Video,
    badge: "Video",
    accentHex: "#8b5cf6",
    accentRgb: "139,92,246",
    title: "Video Processing",
    desc: "Convert & extract audio from video files with zero upload.",
    tags: "MP4 · MKV · WebM · AVI",
  },
  {
    icon: Music,
    badge: "Audio",
    accentHex: "#22d3ee",
    accentRgb: "34,211,238",
    title: "Audio Conversion",
    desc: "Convert formats, compress, and normalize audio in-browser.",
    tags: "WAV · MP3 · AAC · OGG",
  },
  {
    icon: Mic,
    badge: "AI",
    accentHex: "#fbbf24",
    accentRgb: "245,158,11",
    title: "AI Transcription",
    desc: "Speech-to-text powered by OpenAI Whisper, locally processed.",
    tags: "Word timestamps · SRT export",
  },
];

const PRIVACY_STATS = [
  { icon: Shield,   label: "100% Private",          desc: "End-to-end in your browser",        hex: "#8b5cf6", rgb: "139,92,246"  },
  { icon: WifiOff,  label: "Zero Uploads",           desc: "No server ever touches your files", hex: "#22d3ee", rgb: "34,211,238"  },
  { icon: Database, label: "Zero Data Collection",   desc: "No analytics on your content",      hex: "#fbbf24", rgb: "245,158,11"  },
  { icon: Cpu,      label: "In-Browser Processing",  desc: "Web APIs power everything",         hex: "#34d399", rgb: "52,211,153"  },
];

// ── SHARED STYLE ATOMS ────────────────────────────────────────────────────────

const cardBase: React.CSSProperties = {
  background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
};

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a8a9c",
};

// ── NAV ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav
      className="flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-sm"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,8,15,0.75)" }}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/branding/NeuralGrooveIcon.png"
          alt="Neural Groove"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <div className="flex flex-col leading-none gap-0.5">
          <span className="font-tchaikovsky tracking-[0.12em] text-sm" style={{ color: "#f3f3f8" }}>
            Neural Groove
          </span>
          <span style={{ ...monoLabel, fontSize: 9, color: "#5b5b6e", letterSpacing: "0.14em" }}>
            Spectrum Divergent
          </span>
        </div>
      </div>
      <Link
        href="/forge"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
          color: "white",
          boxShadow: "0 4px 16px rgba(139,92,246,0.28)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <Zap className="w-3.5 h-3.5" />
        Launch Forge
      </Link>
    </nav>
  );
}

// ── SECTION 0: HERO ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="section-viewport-center text-center px-4 pb-8">
      {/* Per-section aurora wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 20%, rgba(139,92,246,0.13), transparent 65%)",
        }}
      />

      {/* Privacy pill */}
      <div
        data-scroll-item
        className="relative mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm"
        style={{
          border: "1px solid rgba(34,211,238,0.22)",
          background: "rgba(34,211,238,0.06)",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#22d3ee",
        }}
      >
        <Lock className="w-3 h-3" />
        100% Private &amp; Offline — Files Never Leave Your Device
      </div>

      {/* Headline */}
      <div data-scroll-item className="relative mb-4">
        <div style={{ ...monoLabel, fontSize: 12, letterSpacing: "0.22em", marginBottom: 14 }}>
          Browser-Native Media Forge
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(52px, 8vw, 92px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            color: "#f3f3f8",
          }}
        >
          Neural Groove
        </h1>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(22px, 3.5vw, 40px)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "#8b5cf6",
            marginTop: 6,
          }}
        >
          Spectrum Divergent
        </div>
      </div>

      {/* Tagline */}
      <p
        data-scroll-item
        className="relative text-base md:text-lg max-w-lg leading-relaxed mt-1"
        style={{ color: "#8a8a9c", fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        Video processing, audio conversion &amp; AI transcription.{" "}
        <span style={{ color: "#22d3ee", fontWeight: 500 }}>Zero uploads. Zero traces.</span>
      </p>

      {/* CTAs */}
      <div data-scroll-item className="relative flex flex-wrap items-center justify-center gap-4 mt-8">
        <Link
          href="/forge"
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
            boxShadow: "0 8px 32px rgba(139,92,246,0.30)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Start Processing
          <ChevronRight className="w-4 h-4" />
        </Link>
        <button
          onClick={() => window.scrollTo({ top: 4 * window.innerHeight, behavior: "smooth" })}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
          style={{
            color: "#f3f3f8",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <Headphones className="w-4 h-4" style={{ color: "#fbbf24" }} />
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

// ── SECTION 1: THE FORGE ─────────────────────────────────────────────────────

function ForgeSection() {
  return (
    <div className="section-viewport px-4 md:px-8 pt-8 pb-8">
      <div className="max-w-5xl mx-auto h-full flex flex-col justify-center">

        {/* Section header */}
        <div data-scroll-item className="text-center mb-8">
          <div style={{ ...monoLabel, marginBottom: 10 }}>Browser-Native Tools — No Server Required</div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f3f3f8",
            }}
          >
            The Forge
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, badge, accentHex, accentRgb, title, desc, tags }) => (
            <Link
              href="/forge"
              key={title}
              data-scroll-item
              className="flex flex-col rounded-2xl p-6 transition-all duration-300 cursor-pointer"
              style={{ ...cardBase, position: "relative", overflow: "hidden" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.border = `1px solid rgba(${accentRgb},0.28)`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 32px rgba(${accentRgb},0.10)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {/* Card aurora wash */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(60% 60% at 0% 0%, rgba(${accentRgb},0.10), transparent 70%)`,
                }}
              />

              <div className="relative flex flex-col flex-1">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `rgba(${accentRgb},0.12)`,
                    border: `1px solid rgba(${accentRgb},0.22)`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: accentHex }} />
                </div>

                {/* Badge */}
                <div className="mb-3">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: `rgba(${accentRgb},0.12)`,
                      border: `1px solid rgba(${accentRgb},0.28)`,
                      color: accentHex,
                    }}
                  >
                    {badge}
                  </span>
                </div>

                <h3
                  className="mb-2"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#f3f3f8",
                  }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: "#8a8a9c", fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  {desc}
                </p>
                <p
                  className="mt-4"
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 10,
                    letterSpacing: "0.10em",
                    color: "#5b5b6e",
                  }}
                >
                  {tags}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div data-scroll-item className="flex justify-center mt-6">
          <Link
            href="/forge"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.28)",
              color: "#a78bfa",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Open the Forge
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── SECTION 2: PRIVACY STATS ─────────────────────────────────────────────────

function StatsSection() {
  return (
    <div className="section-viewport-center px-4 md:px-8">
      <div className="max-w-5xl mx-auto w-full">

        {/* Header */}
        <div data-scroll-item className="text-center mb-10">
          <div style={{ ...monoLabel, marginBottom: 10 }}>Privacy by Architecture</div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f3f3f8",
            }}
          >
            Your Data Never Leaves Your Device
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIVACY_STATS.map(({ icon: Icon, label, desc, hex, rgb }) => (
            <div
              key={label}
              data-scroll-item
              className="flex flex-col items-center text-center p-5"
              style={{ ...cardBase, borderRadius: 14, position: "relative", overflow: "hidden" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(60% 55% at 50% 0%, rgba(${rgb},0.08), transparent 70%)`,
                }}
              />
              <div
                className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: `rgba(${rgb},0.12)`,
                  border: `1px solid rgba(${rgb},0.22)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: hex }} />
              </div>
              <p
                className="relative mb-1"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#f3f3f8",
                  lineHeight: 1.2,
                }}
              >
                {label}
              </p>
              <p
                className="relative"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 11,
                  color: "#5b5b6e",
                  lineHeight: 1.4,
                }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION 3: PRO TIP ───────────────────────────────────────────────────────

function ProTipSection() {
  return (
    <div className="section-viewport-center px-4 md:px-8">
      <div className="max-w-4xl mx-auto w-full">
        <div
          data-scroll-item
          className="rounded-2xl p-8"
          style={{
            ...cardBase,
            border: "1px solid rgba(245,158,11,0.18)",
            boxShadow: "0 0 40px rgba(245,158,11,0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Amber aurora wash */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 100% at 0% 0%, rgba(245,158,11,0.08), transparent 70%)",
            }}
          />

          <div className="relative flex gap-5">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.24)",
              }}
            >
              <Lightbulb className="w-5 h-5" style={{ color: "#fbbf24" }} />
            </div>
            <div className="flex-1">
              <div className="mb-3">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.28)",
                    color: "#fbbf24",
                  }}
                >
                  Pro Tip
                </span>
              </div>
              <h3
                className="mb-3"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#fbbf24",
                }}
              >
                Transcribe Specific Segments
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8a8a9c", fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Want to transcribe only part of a video? Select{" "}
                <strong style={{ color: "#f3f3f8", fontWeight: 600 }}>&ldquo;Extract Audio&rdquo;</strong>{" "}
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

// ── SECTION 4: THE MUSIC ─────────────────────────────────────────────────────

function MusicSection() {
  return (
    <div className="section-viewport px-4 md:px-8 pt-4 pb-6">
      <div className="max-w-3xl mx-auto flex flex-col justify-center h-full">

        {/* Amber eyebrow */}
        <div data-scroll-item className="flex justify-center mb-6">
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              padding: "5px 14px",
              borderRadius: 6,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.28)",
              color: "#fbbf24",
            }}
          >
            The Music
          </span>
        </div>

        {/* Headline */}
        <div data-scroll-item className="text-center mb-6">
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(42px, 7vw, 76px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              color: "#f3f3f8",
            }}
          >
            Neural Groove
          </h2>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(20px, 3vw, 36px)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#fbbf24",
              marginTop: 5,
            }}
          >
            Spectrum Divergent
          </div>
        </div>

        {/* Body copy */}
        <div
          data-scroll-item
          className="space-y-3 text-sm leading-relaxed mb-5"
          style={{ color: "#8a8a9c", fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <p>
            Singing, playing, composing songs can be an incredible way to let go of feelings,
            stress, and frustrations.{" "}
            <strong style={{ color: "#f3f3f8", fontWeight: 600 }}>
              Music has a way of reaching emotions that words alone can&apos;t describe.
            </strong>
          </p>
          <p>
            We&apos;re not aiming for perfection.{" "}
            <strong style={{ color: "#f3f3f8", fontWeight: 600 }}>
              It&apos;s about feeling the rawness of pain and frustration, and handling it with hope.
            </strong>
          </p>
        </div>

        {/* Blockquote */}
        <blockquote
          data-scroll-item
          className="pl-5 py-1 mb-6"
          style={{ borderLeft: "3px solid #f59e0b" }}
        >
          <p
            className="text-sm font-semibold leading-relaxed"
            style={{ color: "#fbbf24", fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            By blending instrument riffs, poetic lines, rhythms, and raw energy — you can
            transcend the everyday and tap into something deeper.
          </p>
        </blockquote>

        {/* CTAs */}
        <div data-scroll-item className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/music"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              boxShadow: "0 8px 32px rgba(139,92,246,0.28)",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <Headphones className="w-4 h-4" />
            Listen Now
          </Link>
          <Link
            href="/forge"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-200"
            style={{ color: "#8a8a9c", fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            Launch Forge
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── SECTION 5: FOOTER ────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <div className="section-viewport-center px-4">
      <div data-scroll-item className="text-center space-y-4">
        <Image
          src="/branding/NeuralGrooveIcon.png"
          alt="Neural Groove"
          width={44}
          height={44}
          className="rounded-xl mx-auto"
          style={{ opacity: 0.55 }}
        />
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "#f3f3f8",
          }}
        >
          Neural Groove
        </div>
        <p style={{ ...monoLabel, fontSize: 10, letterSpacing: "0.18em" }}>
          Browser-Native Tools — No Server Required
        </p>
        <p
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10,
            color: "#5b5b6e",
            opacity: 0.6,
          }}
        >
          Zero Uploads · Zero Traces · Zero Compromise
        </p>
        <div className="flex items-center justify-center gap-5 pt-1">
          <Link
            href="/forge"
            style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#8a8a9c" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f3f3f8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8a8a9c"; }}
          >
            Launch Forge
          </Link>
          <span style={{ color: "#3a3a4e" }}>·</span>
          <Link
            href="/music"
            style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#8a8a9c" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f3f3f8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8a8a9c"; }}
          >
            The Music
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [transitionType] = useState(() => pickPageTransition());

  const sections = [
    <HeroSection key="hero" />,
    <ForgeSection key="forge" />,
    <StatsSection key="stats" />,
    <ProTipSection key="protip" />,
    <MusicSection key="music" />,
    <FooterSection key="footer" />,
  ];

  return (
    <main
      className="relative isolate text-aura-text font-sans"
      style={{ background: "#08080f" }}
    >
      {/* ── LAYER 1: Breathing radial glow ── */}
      <div
        className="pointer-events-none fixed inset-0 bg-aura-radial animate-glow-breathe"
        aria-hidden
      />

      {/* ── LAYER 2: Aurora dynamic orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="animate-orb-breathe-a animate-aurora-sweep absolute" style={{ top: "-8%", right: "-10%", width: "500px", height: "500px" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(98,28,255,0.80) 0%, rgba(38,0,180,0.36) 40%, transparent 72%)", filter: "blur(34px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(38,128,255,0.70) 0%, rgba(20,80,220,0.32) 40%, transparent 72%)", filter: "blur(34px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(228,48,198,0.18) 0%, transparent 55%)", filter: "blur(34px)" }} />
        </div>
        <div className="animate-orb-breathe-b animate-aurora-2 animate-core-pulse absolute" style={{ top: "5%", right: "9%", width: "160px", height: "160px" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(38,128,255,0.95) 0%, rgba(38,128,255,0.44) 50%, transparent 70%)", filter: "blur(12px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,140,30,0.85) 0%, rgba(255,80,10,0.38) 50%, transparent 70%)", filter: "blur(12px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(148,68,255,0.60) 0%, rgba(98,28,255,0.24) 50%, transparent 70%)", filter: "blur(12px)" }} />
        </div>
        <div className="animate-orb-breathe-c animate-aurora-sweep absolute" style={{ top: "-22%", right: "-18%", width: "600px", height: "600px" }}>
          <div className="orb-layer-a-s2 absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(38,128,255,0.42) 35deg, rgba(38,128,255,0.78) 65deg, rgba(38,128,255,0.42) 95deg, transparent 130deg)", filter: "blur(18px)" }} />
          <div className="orb-layer-b-s2 absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(98,28,255,0.36) 35deg, rgba(98,28,255,0.68) 65deg, rgba(98,28,255,0.36) 95deg, transparent 130deg)", filter: "blur(18px)" }} />
          <div className="orb-layer-c-s2 absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(255,140,30,0.22) 35deg, rgba(255,140,30,0.45) 65deg, rgba(255,140,30,0.22) 95deg, transparent 130deg)", filter: "blur(18px)" }} />
        </div>
        <div className="animate-orb-breathe-d animate-aurora-1 absolute" style={{ top: "-15%", left: "-10%", width: "430px", height: "380px" }}>
          <div className="orb-layer-a-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(38,128,255,0.65) 0%, rgba(20,60,200,0.28) 50%, transparent 72%)", filter: "blur(44px)" }} />
          <div className="orb-layer-b-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(98,28,255,0.55) 0%, rgba(60,10,180,0.22) 50%, transparent 72%)", filter: "blur(44px)" }} />
          <div className="orb-layer-c-s4 absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(228,48,198,0.12) 0%, transparent 50%)", filter: "blur(44px)" }} />
        </div>
        <div className="animate-orb-breathe-a animate-aurora-3 absolute" style={{ bottom: "-10%", left: "18%", width: "500px", height: "250px", animationDelay: "-4s" }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(255,140,30,0.55) 0%, rgba(255,80,10,0.22) 50%, transparent 72%)", filter: "blur(48px)" }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(0,180,220,0.50) 0%, rgba(0,120,180,0.20) 50%, transparent 72%)", filter: "blur(48px)" }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(98,28,255,0.35) 0%, transparent 55%)", filter: "blur(48px)" }} />
        </div>
      </div>

      {/* ── LAYER 3: Neural net canvas ── */}
      <NeuralNetBackground />

      {/* ── LAYER 4: Noise ── */}
      <div className="pointer-events-none fixed inset-0 bg-[url('/aura-noise.svg')] opacity-[0.22] mix-blend-overlay [background-size:220px_220px]" aria-hidden />

      {/* ── 3D SCROLL SCENE ── */}
      <ScrollScene nav={<Nav />} sections={sections} transitionType={transitionType} />
    </main>
  );
}
