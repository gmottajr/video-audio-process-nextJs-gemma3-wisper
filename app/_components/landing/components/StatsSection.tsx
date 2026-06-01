import { Shield, WifiOff, Database, Cpu } from "lucide-react";

const PRIVACY_STATS = [
  { icon: Shield,   title: "100% Private",         desc: "End-to-end in your browser" },
  { icon: WifiOff,  title: "Zero Uploads",          desc: "No server ever touches your files" },
  { icon: Database, title: "Zero Data Collection",  desc: "No analytics on your content" },
  { icon: Cpu,      title: "In-Browser Processing", desc: "Web APIs power everything" },
];

export function StatsSection() {
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
