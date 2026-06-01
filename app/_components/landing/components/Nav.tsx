import Link from "next/link";
import Image from "next/image";

export function Nav() {
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
