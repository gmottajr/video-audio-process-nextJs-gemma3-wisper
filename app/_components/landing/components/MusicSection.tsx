import Link from "next/link";
import { ChevronRight, Headphones } from "lucide-react";

export function MusicSection() {
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

        {/* Neural Groove / Spectrum Divergent */}
        <div data-scroll-item className="w-full mb-5 select-none" aria-label="Neural Groove Spectrum Divergent">
          <h2
            className="font-display tracking-tight leading-none text-aura-text"
            style={{ fontSize: "clamp(44px, 7vw, 80px)", fontWeight: 700 }}
          >
            Neural Groove
          </h2>
          <div
            className="font-display mt-2"
            style={{
              fontSize: "clamp(26px, 4vw, 54px)",
              color: "var(--violet)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Spectrum Divergent
          </div>
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
