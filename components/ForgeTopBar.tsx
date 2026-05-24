"use client";

import Image from "next/image";
import Link from "next/link";
import { Cpu } from "lucide-react";
import type { AppState } from "@/hooks/useAppStateMachine";

/**
 * ForgeTopBar — compact unified chrome for /forge.
 *
 * Replaces the previous separation between <Breadcrumbs/> and a standalone
 * hardware-capability badge row. Mirrors the prototype's tight one-line
 * top bar: brand → step pills → system status badges.
 *
 * Drop-in: same prop shape as Breadcrumbs (currentState, onNavigate),
 * plus an optional hardware tier so the system badge can update live.
 */

interface HardwareCapability {
  tier: "high" | "medium" | "low";
  deviceMemoryGB?: number | null;
}

interface ForgeTopBarProps {
  currentState: AppState;
  onNavigate?: () => void;
  hardware?: HardwareCapability;
  /** If false, the system status badges on the right are hidden (use inside
   *  full-screen processing overlays where only the brand + steps are needed). */
  showStatusBadges?: boolean;
}

const STEPS: { state: AppState; label: string; n: number }[] = [
  { state: "IDLE",       label: "Select",     n: 1 },
  { state: "INSPECT",    label: "Configure",  n: 2 },
  { state: "PROCESSING", label: "Processing", n: 3 },
  { state: "DONE",       label: "Complete",   n: 4 },
];

export function ForgeTopBar({
  currentState,
  onNavigate,
  hardware,
  showStatusBadges = true,
}: ForgeTopBarProps) {
  const currentIdx = STEPS.findIndex(s => s.state === currentState);
  const isError = currentState === "ERROR";

  const hardwareLabel = hardware
    ? hardware.tier === "high"
      ? `High-Performance · ${hardware.deviceMemoryGB ?? ""}GB · GPU Ready`
      : hardware.tier === "medium"
      ? "Standard Performance"
      : "Basic Performance"
    : null;

  const hardwareColor =
    hardware?.tier === "high"
      ? "oklch(82% 0.14 155)"
      : hardware?.tier === "medium"
      ? "oklch(74% 0.13 195)"
      : "oklch(78% 0.15 75)";
  const hardwareBg =
    hardware?.tier === "high"
      ? "oklch(70% 0.18 155 / 0.10)"
      : hardware?.tier === "medium"
      ? "oklch(66% 0.17 195 / 0.10)"
      : "oklch(78% 0.15 75 / 0.10)";
  const hardwareBorder =
    hardware?.tier === "high"
      ? "oklch(70% 0.18 155 / 0.30)"
      : hardware?.tier === "medium"
      ? "oklch(66% 0.17 195 / 0.30)"
      : "oklch(78% 0.15 75 / 0.30)";

  return (
    <div
      className="flex items-center gap-4 px-1 py-2"
      style={{ position: "relative", zIndex: 5 }}
    >
      {/* ── BRAND lockup ───────────────────────────────────────────────── */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 shrink-0 opacity-90 hover:opacity-100 transition-opacity"
      >
        <Image
          src="/branding/NeuralGrooveIcon.png"
          alt="Neural Groove"
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
        <div className="leading-tight hidden sm:block">
          <div className="font-tchaikovsky tracking-[0.10em] text-[14px] text-aura-text">
            Neural Groove
          </div>
          <div
            className="font-mono text-[9px] tracking-[0.18em] uppercase"
            style={{ color: "oklch(55% 0.02 280)" }}
          >
            Forge
          </div>
        </div>
      </Link>

      <div
        className="h-6 w-px shrink-0 hidden sm:block"
        style={{ background: "oklch(38% 0.02 280 / 0.50)" }}
      />

      {/* ── STEP pills ─────────────────────────────────────────────────── */}
      {isError ? (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "oklch(30% 0.08 25 / 0.40)",
            border: "1px solid oklch(55% 0.18 25 / 0.35)",
          }}
        >
          <span
            className="font-mono text-[11px] tracking-[0.14em] uppercase"
            style={{ color: "oklch(72% 0.14 25)" }}
          >
            Error
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
          {STEPS.map((step, i) => {
            const active = step.state === currentState;
            const done = i < currentIdx;
            return (
              <div key={step.state} className="flex items-center gap-1.5 shrink-0">
                <div
                  className="flex items-center gap-2 rounded-full transition-all duration-200"
                  style={{
                    padding: "5px 12px",
                    background: active ? "oklch(60% 0.28 290 / 0.16)" : "transparent",
                    border: active
                      ? "1px solid oklch(60% 0.28 290 / 0.40)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: active
                        ? "oklch(60% 0.28 290)"
                        : done
                        ? "oklch(70% 0.18 155 / 0.85)"
                        : "oklch(28% 0.025 280 / 0.85)",
                      color: "white",
                    }}
                  >
                    {done ? (
                      <span className="text-[10px] font-bold leading-none">✓</span>
                    ) : (
                      <span
                        className="font-mono text-[10px] font-bold leading-none"
                        style={{ color: active ? "white" : "oklch(55% 0.02 280)" }}
                      >
                        {step.n}
                      </span>
                    )}
                  </div>
                  <span
                    className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
                    style={{
                      color: active
                        ? "oklch(90% 0.05 290)"
                        : done
                        ? "oklch(60% 0.05 195)"
                        : "oklch(45% 0.02 280)",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-3 h-px shrink-0"
                    style={{
                      background:
                        i < currentIdx
                          ? "oklch(70% 0.18 155 / 0.50)"
                          : "oklch(38% 0.02 280 / 0.50)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── SPACER ─────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── STATUS BADGES (right) ──────────────────────────────────────── */}
      {showStatusBadges && (
        <div className="flex items-center gap-2 shrink-0">
          {hardwareLabel && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: hardwareBg,
                border: `1px solid ${hardwareBorder}`,
              }}
              title="Your device's processing capability for media operations"
            >
              <Cpu className="w-3 h-3" style={{ color: hardwareColor }} />
              <span
                suppressHydrationWarning
                className="font-mono text-[10px] tracking-[0.12em] uppercase"
                style={{ color: hardwareColor }}
              >
                {hardwareLabel}
              </span>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "oklch(70% 0.18 155 / 0.10)",
              border: "1px solid oklch(70% 0.18 155 / 0.30)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "oklch(70% 0.18 155)",
                boxShadow: "0 0 6px oklch(70% 0.18 155)",
              }}
            />
            <span
              className="font-mono text-[10px] tracking-[0.14em] uppercase"
              style={{ color: "oklch(82% 0.14 155)" }}
            >
              100% Local
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
