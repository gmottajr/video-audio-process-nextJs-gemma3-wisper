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
} from "lucide-react";
import NeuralFont from "@/components/NeuralFont";
import { NeuralNetBackground } from "@/components/NeuralNetBackground";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { ScrollScene } from "@/components/ScrollScene";
import { pickPageTransition } from "@/lib/pageTransition";

// ── DATA ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Video,
    badge: "Video",
    badgeColor: "oklch(60% 0.20 290)",
    iconBg: "oklch(60% 0.20 290 / 0.12)",
    iconBorder: "oklch(60% 0.20 290 / 0.22)",
    iconColor: "oklch(74% 0.16 290)",
    auraBg: "oklch(60% 0.20 290 / 0.10)",
    title: "Video Processing",
    desc: "Convert & extract audio from video files with zero upload.",
    tags: "MP4 · MKV · WebM · AVI",
  },
  {
    icon: Music,
    badge: "Audio",
    badgeColor: "oklch(66% 0.17 195)",
    iconBg: "oklch(66% 0.17 195 / 0.12)",
    iconBorder: "oklch(66% 0.17 195 / 0.22)",
    iconColor: "oklch(74% 0.13 195)",
    auraBg: "oklch(66% 0.17 195 / 0.10)",
    title: "Audio Conversion",
    desc: "Convert formats, compress, and normalize audio in-browser.",
    tags: "WAV · MP3 · AAC · OGG",
  },
  {
    icon: Mic,
    badge: "AI",
    badgeColor: "oklch(78% 0.15 75)",
    iconBg: "oklch(78% 0.15 75 / 0.12)",
    iconBorder: "oklch(78% 0.15 75 / 0.22)",
    iconColor: "oklch(78% 0.15 75)",
    auraBg: "oklch(78% 0.15 75 / 0.10)",
    title: "AI Transcription",
    desc: "Speech-to-text powered by OpenAI Whisper, locally processed.",
    tags: "Word timestamps · SRT export",
  },
];

const PRIVACY_STATS = [
  { icon: Shield,   title: "100% Private",          desc: "End-to-end in your browser" },
  { icon: WifiOff,  title: "Zero Uploads",           desc: "No server ever touches your files" },
  { icon: Database, title: "Zero Data Collection",   desc: "No analytics on your content" },
  { icon: Cpu,      title: "In-Browser Processing",  desc: "Web APIs power everything" },
];

// ── NAV ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-aura-border backdrop-blur-sm bg-aura-canvas/75">
      <div className="flex items-center gap-3">
        <Image
          src="/branding/NeuralGrooveIcon.png"
          alt="Neural Groove"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <div className="flex flex-col leading-none gap-0.5">
          <span className="font-tchaikovsky tracking-[0.12em] text-sm text-aura-text">
            Neural Groove
          </span>
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-aura-muted">
            Spectrum Divergent
          </span>
        </div>
      </div>
      <Link
        href="/forge"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
        style={{ background: "var(--violet)", color: "white" }}
      >
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
          className="font-chaotic tracking-tight leading-none text-aura-text"
          style={{ fontSize: "clamp(52px, 8vw, 92px)" }}
        >
          Neural Groove
        </h1>
        <div
          className="font-jazz mt-1.5"
          style={{ fontSize: "clamp(22px, 3.5vw, 40px)", color: "var(--violet)" }}
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

// ── SECTION 1: THE FORGE ─────────────────────────────────────────────────────

function ForgeSection() {
  return (
    <div className="section-viewport px-4 md:px-8 pt-8 pb-8">
      <div className="max-w-5xl mx-auto h-full flex flex-col justify-center">

        {/* Section header */}
        <div data-scroll-item className="text-center mb-8">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-aura-muted mb-2.5">
            Browser-Native Tools — No Server Required
          </div>
          <h2
            className="font-chaotic text-aura-text"
            style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
          >
            The Forge
          </h2>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, badge, badgeColor, iconBg, iconBorder, iconColor, auraBg, title, desc, tags }) => (
            <Link
              href="/forge"
              key={title}
              data-scroll-item
              className="flex flex-col rounded-2xl p-6 transition-all duration-300 cursor-pointer"
              style={{
                background: "oklch(22% 0.025 280 / 0.70)",
                border: "1px solid oklch(38% 0.02 280 / 0.30)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${badgeColor}40`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 32px ${badgeColor}18`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "oklch(38% 0.02 280 / 0.30)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {/* Card aurora wash */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `radial-gradient(60% 60% at 0% 0%, ${auraBg}, transparent 70%)` }}
              />

              <div className="relative flex flex-col flex-1">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>

                {/* Badge */}
                <div className="mb-3">
                  <span
                    className="font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded"
                    style={{
                      background: `${badgeColor}12`,
                      border: `1px solid ${badgeColor}28`,
                      color: badgeColor,
                    }}
                  >
                    {badge}
                  </span>
                </div>

                <h3 className="font-jazz text-aura-text mb-2" style={{ fontSize: 17 }}>
                  {title}
                </h3>
                <p className="text-sm text-aura-muted leading-relaxed flex-1">{desc}</p>
                <p className="mt-4 font-mono text-[10px] tracking-[0.10em] text-aura-muted opacity-60">
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
              background: "oklch(60% 0.20 290 / 0.08)",
              border: "1px solid oklch(60% 0.20 290 / 0.28)",
              color: "oklch(74% 0.16 290)",
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
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-aura-muted mb-2.5">
            Privacy by Architecture
          </div>
          <h2
            className="font-chaotic text-aura-text"
            style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
          >
            Your Data Never Leaves Your Device
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRIVACY_STATS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              data-scroll-item
              className="flex flex-col items-center text-center p-5 rounded-2xl"
              style={{
                background: "oklch(22% 0.025 280 / 0.70)",
                border: "1px solid oklch(66% 0.17 195 / 0.15)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(60% 55% at 50% 0%, oklch(66% 0.17 195 / 0.08), transparent 70%)" }}
              />
              <div
                className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{
                  background: "oklch(66% 0.17 195 / 0.12)",
                  border: "1px solid oklch(66% 0.17 195 / 0.22)",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: "var(--teal)" }} />
              </div>
              <p
                className="relative font-jazz text-aura-text mb-1"
                style={{ fontSize: 14, lineHeight: 1.2 }}
              >
                {title}
              </p>
              <p className="relative text-[11px] text-aura-muted leading-snug">{desc}</p>
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

// ── SECTION 4: THE MUSIC ─────────────────────────────────────────────────────

function MusicSection() {
  return (
    <div className="section-viewport px-4 md:px-8 pt-4 pb-6">
      <div className="max-w-3xl mx-auto flex flex-col justify-center h-full">

        {/* Amber eyebrow */}
        <div data-scroll-item className="flex justify-center mb-6">
          <span
            className="font-mono text-[11px] tracking-[0.22em] uppercase px-3.5 py-1.5 rounded"
            style={{
              background: "oklch(72% 0.16 55 / 0.08)",
              border: "1px solid oklch(72% 0.16 55 / 0.28)",
              color: "var(--amber)",
            }}
          >
            The Music
          </span>
        </div>

        {/* Neural font heading */}
        <div data-scroll-item className="w-full mb-5 select-none" aria-label="Neural Groove Spectrum Divergent">
          <NeuralFont text="Neural Groove" fontSize={80} className="w-full" />
          <NeuralFont text="Spectrum Divergent" fontSize={54} className="w-full" />
        </div>

        {/* Body copy */}
        <div data-scroll-item className="space-y-3 text-sm text-aura-muted leading-relaxed mb-5">
          <p>
            Singing, playing, composing songs can be an incredible way to let go of feelings,
            stress, and frustrations.{" "}
            <strong className="text-aura-text font-semibold">
              Music has a way of reaching emotions that words alone can&apos;t describe.
            </strong>
          </p>
          <p>
            We&apos;re not aiming for perfection.{" "}
            <strong className="text-aura-text font-semibold">
              It&apos;s about feeling the rawness of pain and frustration, and handling it with hope.
            </strong>
          </p>
        </div>

        {/* Blockquote */}
        <blockquote
          data-scroll-item
          className="pl-5 py-1 mb-6"
          style={{ borderLeft: "3px solid var(--amber)" }}
        >
          <p className="text-sm font-semibold leading-relaxed" style={{ color: "var(--amber)" }}>
            By blending instrument riffs, poetic lines, rhythms, and raw energy — you can
            transcend the everyday and tap into something deeper.
          </p>
        </blockquote>

        {/* CTAs */}
        <div data-scroll-item className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/music"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.03]"
            style={{ background: "var(--violet)", boxShadow: "0 8px 32px oklch(60% 0.20 290 / 0.28)" }}
          >
            <Headphones className="w-4 h-4" />
            Listen Now
          </Link>
          <Link
            href="/forge"
            className="inline-flex items-center gap-2 text-sm font-semibold text-aura-muted hover:text-aura-text transition-colors duration-200"
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
        <div className="font-tchaikovsky text-lg tracking-[0.12em] text-aura-text">
          Neural Groove
        </div>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-aura-muted">
          Browser-Native Tools — No Server Required
        </p>
        <p className="font-mono text-[10px] tracking-[0.10em] text-aura-muted opacity-60">
          Zero Uploads · Zero Traces · Zero Compromise
        </p>
        <div className="flex items-center justify-center gap-5 pt-1">
          <Link
            href="/forge"
            className="text-xs text-aura-muted hover:text-aura-text transition-colors"
          >
            Launch Forge
          </Link>
          <span className="text-aura-border select-none">·</span>
          <Link
            href="/music"
            className="text-xs text-aura-muted hover:text-aura-text transition-colors"
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
    <main className="relative isolate bg-aura-canvas text-aura-text font-sans">
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
