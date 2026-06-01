import Link from "next/link";
import Image from "next/image";

export function FooterSection() {
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
