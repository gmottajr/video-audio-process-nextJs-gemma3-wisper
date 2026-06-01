"use client";

import Link from "next/link";
import { ChevronRight, Video, Music, Mic } from "lucide-react";

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

export function ForgeSection() {
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
