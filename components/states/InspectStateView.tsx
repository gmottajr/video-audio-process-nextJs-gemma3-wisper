"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Loader2,
  FileVideo,
  FileAudio,
  ChevronLeft,
  Music,
  Film,
  Brain,
  Zap,
  ArrowRight,
} from "lucide-react";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ActionSelector, type ActionType, type ActionOptions, type ActionSelectorHandle } from "@/components/ActionSelector";
import type { VideoMode } from "@/components/VideoModeTabs";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import type { TranscriptionMode, DevicePreference } from "@/types/fast-mode";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { MediaPreview } from "@/components/MediaPreview";

interface InspectStateViewProps {
  file: File;
  metrics: any;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoading: boolean;
  isTranscribing: boolean;
  onModelSelect: (modelKey: ModelKey) => void;
  transcriptionMode: TranscriptionMode;
  onModeChange: (mode: TranscriptionMode) => void;
  onWorkerConfigChange?: (config: { workers: number; useGPU: boolean; memoryBudgetMB: number; devicePreference: DevicePreference }) => void;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  onBack: () => void;
  isFFmpegLoaded: boolean;
  isFFmpegLoading?: boolean;
  isModelLoaded: boolean;
  modelLoadingProgress: number;
}

const SECTION_LABEL = "font-mono text-[11px] tracking-[0.18em] uppercase";
const MODE_STORAGE_KEY = "mediaforge_transcription_mode";

type FileKind = "video" | "audio" | "unknown";

function detectKind(file: File): FileKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "unknown";
}

interface DetectedCaps {
  cpuThreads: number;
  gpu: boolean;
  gpuDevice: string | null;
  ramGB: number;
  recommendedWorkers: number;
  maxWorkers: number;
}

/**
 * InspectStateView — Dashboard layout (matches the standalone prototype).
 *
 * Two-column grid: configuration choices on the left, system signals + preview
 * on the right. Floating bottom pill provides keyboard hints and the primary
 * CTA. TRANSCRIPTION MODE + AI MODEL are always visible (dimmed when the
 * active action isn't AI transcription).
 */
export function InspectStateView({
  file,
  metrics,
  selectedModelKey,
  currentModel,
  isModelLoading,
  isTranscribing,
  onModelSelect,
  transcriptionMode,
  onModeChange,
  onWorkerConfigChange,
  onAction,
  onBack,
  isFFmpegLoaded,
  isFFmpegLoading = false,
  isModelLoaded,
  modelLoadingProgress,
}: InspectStateViewProps) {
  const fastModeEnabled = isFeatureEnabled("ENABLE_FAST_MODE");
  const kind = detectKind(file);

  // Lifted from ActionSelector so the prominent tiles + the floating CTA drive it.
  const [actionTile, setActionTile] = useState<VideoMode>(
    kind === "audio" ? "convert" : "extract"
  );

  // Capability detection runs once on mount (client-only).
  const [caps, setCaps] = useState<DetectedCaps | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("@/utils/systemCapabilities").then(async (mod) => {
      try {
        const c = await mod.detectSystemCapabilities();
        const rec = mod.calculateOptimalWorkers(c);
        if (cancelled) return;
        setCaps({
          cpuThreads: c.cpu.threads,
          gpu: c.gpu.webgpuSupported,
          gpuDevice: c.gpu.device || null,
          ramGB: Math.round(c.memory.totalGB),
          recommendedWorkers: rec.recommendedWorkers,
          maxWorkers: rec.maxWorkers,
        });
      } catch {
        if (cancelled) return;
        setCaps({
          cpuThreads: typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 4) : 4,
          gpu: false,
          gpuDevice: null,
          ramGB: 0,
          recommendedWorkers: 2,
          maxWorkers: 4,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Worker config — local state mirrored to the parent via onWorkerConfigChange.
  const [workerCount, setWorkerCount] = useState<number>(0);
  const [devicePreference, setDevicePreference] = useState<DevicePreference>("auto");
  useEffect(() => {
    if (caps && workerCount === 0) setWorkerCount(caps.recommendedWorkers);
  }, [caps, workerCount]);
  useEffect(() => {
    if (!caps || !onWorkerConfigChange) return;
    const useGPU = devicePreference === "gpu" || (devicePreference === "auto" && caps.gpu);
    const memoryPerWorkerMB = useGPU ? 300 : 600;
    onWorkerConfigChange({
      workers: workerCount,
      useGPU,
      memoryBudgetMB: workerCount * memoryPerWorkerMB + 1000,
      devicePreference,
    });
  }, [caps, workerCount, devicePreference, onWorkerConfigChange]);

  // Floating CTA drives the action through ActionSelector's imperative handle.
  const actionRef = useRef<ActionSelectorHandle>(null);
  const triggerAction = () => actionRef.current?.triggerAction();

  const isTranscribeTile = actionTile === "transcribe";

  // Keyboard navigation — ← back, → fire CTA, 1 back, 2 no-op, 3/4 no-op.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTranscribing) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        onBack();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        triggerAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTranscribing, onBack]);

  const ctaLabel = useMemo(() => {
    if (isTranscribeTile) {
      if (transcriptionMode === "fast") return "Start transcription · Fast Mode";
      return "Start transcription";
    }
    if (actionTile === "extract") return "Extract audio";
    return kind === "audio" ? "Convert format" : "Convert video";
  }, [actionTile, transcriptionMode, kind, isTranscribeTile]);

  const ctaDisabled =
    !isFFmpegLoaded ||
    isTranscribing ||
    (isTranscribeTile && (!isModelLoaded || isModelLoading));

  return (
    <div className="animate-in fade-in duration-500 max-w-[1480px] mx-auto px-4 pb-24">
      {/* ── FILE STRIP ── */}
      <div
        className="flex items-center gap-3 mb-5 px-4 py-2.5 rounded-xl"
        style={{
          background: "oklch(22% 0.025 280 / 0.6)",
          border: "1px solid oklch(38% 0.02 280 / 0.35)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg grid place-items-center"
          style={{
            background: "oklch(60% 0.20 290 / 0.12)",
            border: "1px solid oklch(60% 0.20 290 / 0.25)",
            color: "oklch(74% 0.16 290)",
          }}
        >
          {kind === "audio" ? <FileAudio className="w-4 h-4" /> : <FileVideo className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {file.name}
          </div>
          <div
            className="font-mono text-[10px] tracking-[0.08em] uppercase mt-0.5"
            style={{ color: "oklch(50% 0.02 280)" }}
          >
            {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || "unknown type"}
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:scale-[1.02]"
          style={{
            background: "transparent",
            border: "1px solid oklch(38% 0.02 280 / 0.4)",
            color: "var(--text-muted)",
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Change file
        </button>
      </div>

      {!isFFmpegLoaded && (
        <div
          className="mb-5 p-3 rounded-xl flex items-center gap-3"
          style={{
            background: "oklch(22% 0.025 280 / 0.7)",
            border: "1px solid oklch(60% 0.28 290 / 0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "oklch(74% 0.16 290)" }} />
          <div>
            <p className="text-sm font-medium text-aura-text">
              {isFFmpegLoading ? "Initializing processing engine…" : "Processing engine not loaded"}
            </p>
            <p className="text-xs text-aura-muted">
              {isFFmpegLoading ? "FFmpeg WebAssembly is loading" : "Click any action to reload"}
            </p>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN DASHBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* ── LEFT column ── */}
        <div className="flex flex-col gap-5 min-w-0">
          {kind !== "unknown" && (
            <Card>
              <StepTitle text="Step 02 · Choose action" />
              <ActionTiles
                kind={kind}
                value={actionTile}
                onChange={setActionTile}
                disabled={!isFFmpegLoaded || isTranscribing}
              />
            </Card>
          )}

          {/* Action-specific config + audio enhancement live inside ActionSelector. */}
          <ActionSelector
            ref={actionRef}
            file={file}
            onAction={onAction}
            disabled={!isFFmpegLoaded || isTranscribing}
            isModelLoading={isModelLoading}
            isModelLoaded={isModelLoaded}
            modelLoadingProgress={modelLoadingProgress}
            selectedModelKey={transcriptionMode === "fast" ? "distil-small" : selectedModelKey}
            transcriptionMode={transcriptionMode}
            videoMode={actionTile}
            onVideoModeChange={setActionTile}
            hideInternalTabs
            hideHeader
            hideActionButton
          />

          {/* TRANSCRIPTION MODE — always visible, dimmed when not the active action. */}
          {fastModeEnabled && (
            <TranscriptionModeTiles
              selected={transcriptionMode}
              onSelect={onModeChange}
              disabled={isTranscribing}
              dimmed={!isTranscribeTile}
            />
          )}

          {/* AI MODEL — always visible, dimmed when not the active action. */}
          <ModelTilesGrid
            selected={transcriptionMode === "fast" ? "distil-small" : selectedModelKey}
            currentlyLoaded={currentModel}
            onSelect={onModelSelect}
            fastMode={transcriptionMode === "fast"}
            disabled={isTranscribing || isModelLoading}
            dimmed={!isTranscribeTile}
          />
        </div>

        {/* ── RIGHT column ── */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card>
            <CardHeader title="System capabilities" />
            <CapabilityStatTiles caps={caps} workers={workerCount || caps?.recommendedWorkers || 0} />
            <GpuAccelerationRow caps={caps} />
            <div className="mt-4">
              <InferenceDeviceControl
                caps={caps}
                value={devicePreference}
                onChange={setDevicePreference}
              />
            </div>
            <div className="mt-4">
              <WorkerCountSlider
                caps={caps}
                value={workerCount || caps?.recommendedWorkers || 2}
                onChange={setWorkerCount}
                useGPU={
                  devicePreference === "gpu" ||
                  (devicePreference === "auto" && !!caps?.gpu)
                }
              />
            </div>
          </Card>

          <PreviewPane file={file} />

          {/* File information stays on the right column, below preview. */}
          <Card>
            <CardHeader title="File information" />
            <div className="-mx-1">
              <MetadataDisplay metrics={metrics} file={file} variant="compact" />
            </div>
          </Card>
        </div>
      </div>

      <FloatingActionBar
        label={ctaLabel}
        onCta={triggerAction}
        ctaDisabled={ctaDisabled}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── Card primitives ─────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function Card({ children, dimmed = false }: { children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div
      className="p-5 rounded-xl transition-opacity duration-200"
      style={{
        background: "oklch(22% 0.025 280 / 0.55)",
        border: "1px solid oklch(38% 0.02 280 / 0.35)",
        backdropFilter: "blur(8px)",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {children}
    </div>
  );
}

/**
 * StepTitle — larger, more readable section title.
 *
 * A static near-black "watermark" copy of the text sits underneath, always
 * visible at the same dimensions. A colored overlay is positioned exactly on
 * top of it; its width animates 0→100% and back via stepped infinite-alternate
 * so the same label is continually being typed and un-typed in place. The
 * overlay carries its own right-side border which blinks — that's the cursor,
 * and because it lives on the *clipped* edge it naturally rides along with
 * each character being revealed.
 */
function StepTitle({ text }: { text: string }) {
  const steps = text.length;
  // One-way duration scales with text length, clamped to feel deliberate.
  const duration = `${Math.max(1.2, Math.min(3.6, steps * 0.11)).toFixed(2)}s`;
  const accent = "oklch(74% 0.16 290)";
  const sharedTextStyles: React.CSSProperties = {
    fontSize: 16,
    letterSpacing: "0.16em",
    lineHeight: 1.2,
  };
  return (
    <div className="relative inline-block mb-4 select-none">
      {/* Static black "watermark" — sizes the layout and stays put. */}
      <span
        className="font-mono uppercase block"
        style={{
          ...sharedTextStyles,
          color: "oklch(55% 0.12 220)",
        }}
      >
        {text}
      </span>
      {/* Colored typewriter overlay with cursor on the trailing edge. */}
      <span
        aria-hidden
        className="font-mono uppercase absolute left-0 top-0 overflow-hidden whitespace-nowrap animate-typewriter"
        style={{
          ...sharedTextStyles,
          color: accent,
          borderRight: `2px solid ${accent}`,
          ["--tw-steps" as any]: steps,
          ["--tw-duration" as any]: duration,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function CardHeader({
  title,
  trailing,
  hint,
}: {
  title: string;
  trailing?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      <div className="flex items-center gap-2">
        {hint && (
          <span className="text-[11px]" style={{ color: "oklch(55% 0.02 280)" }}>
            {hint}
          </span>
        )}
        {trailing}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── ACTION TILES ────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

interface ActionTilesProps {
  kind: "video" | "audio";
  value: VideoMode;
  onChange: (mode: VideoMode) => void;
  disabled?: boolean;
}

function ActionTiles({ kind, value, onChange, disabled }: ActionTilesProps) {
  const tiles: Array<{
    id: VideoMode;
    icon: typeof Music;
    iconColor: string;
    iconBg: string;
    iconBorder: string;
    title: string;
    sub: string;
  }> =
    kind === "video"
      ? [
          {
            id: "extract",
            icon: Music,
            iconColor: "oklch(74% 0.16 290)",
            iconBg: "oklch(60% 0.20 290 / 0.14)",
            iconBorder: "oklch(60% 0.20 290 / 0.30)",
            title: "Extract audio",
            sub: "Pull audio track from video",
          },
          {
            id: "convert",
            icon: Film,
            iconColor: "oklch(74% 0.13 195)",
            iconBg: "oklch(66% 0.17 195 / 0.14)",
            iconBorder: "oklch(66% 0.17 195 / 0.30)",
            title: "Convert container",
            sub: "Re-mux without re-encoding",
          },
          {
            id: "transcribe",
            icon: Brain,
            iconColor: "oklch(74% 0.16 290)",
            iconBg: "oklch(60% 0.20 290 / 0.16)",
            iconBorder: "oklch(60% 0.20 290 / 0.50)",
            title: "AI transcription",
            sub: "Speech-to-text via Whisper",
          },
        ]
      : [
          {
            id: "convert",
            icon: Music,
            iconColor: "oklch(74% 0.13 195)",
            iconBg: "oklch(66% 0.17 195 / 0.14)",
            iconBorder: "oklch(66% 0.17 195 / 0.30)",
            title: "Convert format",
            sub: "Change to a different audio format",
          },
          {
            id: "transcribe",
            icon: Brain,
            iconColor: "oklch(74% 0.16 290)",
            iconBg: "oklch(60% 0.20 290 / 0.16)",
            iconBorder: "oklch(60% 0.20 290 / 0.50)",
            title: "AI transcription",
            sub: "Speech-to-text via Whisper",
          },
        ];

  return (
    <div className={`grid gap-2.5 ${tiles.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} grid-cols-1`}>
      {tiles.map((t) => {
        const active = value === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !disabled && onChange(t.id)}
            disabled={disabled}
            className="flex items-start gap-3 text-left p-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: active
                ? "linear-gradient(180deg, oklch(60% 0.20 290 / 0.16), oklch(60% 0.20 290 / 0.05))"
                : "oklch(24% 0.025 280 / 0.65)",
              border: active
                ? "1px solid oklch(60% 0.20 290 / 0.50)"
                : "1px solid oklch(38% 0.02 280 / 0.35)",
              boxShadow: active ? "0 0 0 4px oklch(60% 0.20 290 / 0.08)" : "none",
            }}
          >
            <div
              className="w-7 h-7 rounded-md grid place-items-center shrink-0 transition-colors"
              style={{
                background: active ? "oklch(60% 0.20 290)" : t.iconBg,
                border: active ? "1px solid oklch(60% 0.20 290)" : `1px solid ${t.iconBorder}`,
                color: active ? "#fff" : t.iconColor,
              }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px] leading-snug" style={{ color: "var(--text)" }}>
                {t.title}
              </div>
              <div className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>
                {t.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── TRANSCRIPTION MODE TILES ────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

interface TranscriptionModeTilesProps {
  selected: TranscriptionMode;
  onSelect: (mode: TranscriptionMode) => void;
  disabled?: boolean;
  dimmed?: boolean;
}

function TranscriptionModeTiles({ selected, onSelect, disabled, dimmed }: TranscriptionModeTilesProps) {
  // Persist preference (port of TranscriptionModeSelector's localStorage logic).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if ((stored === "standard" || stored === "fast") && stored !== selected) {
        onSelect(stored);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const handle = (m: TranscriptionMode) => {
    if (disabled) return;
    onSelect(m);
  };

  return (
    <Card dimmed={dimmed}>
      <CardHeader
        title="Transcription mode"
        trailing={
          <span
            className="font-mono text-[9.5px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded"
            style={{
              color: "oklch(80% 0.14 55)",
              background: "oklch(72% 0.16 55 / 0.10)",
              border: "1px solid oklch(72% 0.16 55 / 0.25)",
            }}
          >
            Beta
          </span>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <ModeTile
          active={selected === "standard"}
          accent="violet"
          title="Standard"
          right="Default"
          desc="Single worker · word-level timestamps · audio enhancements"
          onClick={() => handle("standard")}
          disabled={disabled}
        />
        <ModeTile
          active={selected === "fast"}
          accent="amber"
          title="Fast (Parallel)"
          right="~6× faster"
          desc="All CPU cores · up to 16 workers · any model"
          onClick={() => handle("fast")}
          disabled={disabled}
        />
      </div>
    </Card>
  );
}

function ModeTile({
  active,
  accent,
  title,
  right,
  desc,
  onClick,
  disabled,
}: {
  active: boolean;
  accent: "violet" | "amber";
  title: string;
  right: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const tone =
    accent === "amber"
      ? {
          color: "oklch(72% 0.16 55)",
          dotBorder: "oklch(72% 0.16 55)",
          activeBg: "oklch(72% 0.16 55 / 0.08)",
          activeBorder: "oklch(72% 0.16 55 / 0.45)",
          chipBg: "oklch(72% 0.16 55 / 0.15)",
          chipColor: "oklch(80% 0.14 55)",
        }
      : {
          color: "oklch(60% 0.20 290)",
          dotBorder: "oklch(60% 0.20 290)",
          activeBg: "oklch(60% 0.20 290 / 0.08)",
          activeBorder: "oklch(60% 0.20 290 / 0.45)",
          chipBg: "oklch(60% 0.20 290 / 0.15)",
          chipColor: "oklch(78% 0.10 290)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start text-left p-3.5 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: active ? tone.activeBg : "oklch(24% 0.025 280 / 0.65)",
        border: active ? `1px solid ${tone.activeBorder}` : "1px solid oklch(38% 0.02 280 / 0.35)",
      }}
    >
      <div className="flex items-center gap-2.5 w-full mb-1.5">
        <span
          className="w-4 h-4 rounded-full shrink-0 grid place-items-center transition-all"
          style={{
            border: `2px solid ${active ? tone.dotBorder : "oklch(38% 0.02 280 / 0.7)"}`,
          }}
        >
          {active && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: tone.dotBorder }}
            />
          )}
        </span>
        <span className="font-semibold text-[13.5px]" style={{ color: "var(--text)" }}>
          {title}
        </span>
        <span
          className="ml-auto font-mono text-[9.5px] tracking-[0.10em] uppercase px-1.5 py-0.5 rounded"
          style={
            active
              ? { background: tone.chipBg, color: tone.chipColor }
              : { background: "oklch(32% 0.02 280 / 0.6)", color: "oklch(60% 0.02 280)" }
          }
        >
          {right}
        </span>
      </div>
      <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-muted)" }}>
        {desc}
      </p>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── MODEL TILES GRID ────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

interface ModelTilesGridProps {
  selected: ModelKey;
  currentlyLoaded: string | null;
  onSelect: (m: ModelKey) => void;
  fastMode: boolean;
  disabled?: boolean;
  dimmed?: boolean;
}

const MODEL_ORDER: ModelKey[] = ["tiny", "base", "small", "distil-small"];

function ModelTilesGrid({
  selected,
  currentlyLoaded,
  onSelect,
  fastMode,
  disabled,
  dimmed,
}: ModelTilesGridProps) {
  return (
    <Card dimmed={dimmed}>
      <CardHeader
        title="AI model"
        trailing={
          fastMode ? (
            <span
              className="font-mono text-[9.5px] tracking-[0.12em] uppercase px-2 py-0.5 rounded"
              style={{
                color: "oklch(78% 0.14 195)",
                background: "oklch(66% 0.17 195 / 0.10)",
                border: "1px solid oklch(66% 0.17 195 / 0.30)",
              }}
            >
              Fast mode · Parallel
            </span>
          ) : null
        }
      />
      <p
        className="text-[12px] leading-snug mb-3 -mt-1"
        style={{ color: "var(--text-muted)" }}
      >
        Pick based on speed vs. accuracy. All run 100% locally.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {MODEL_ORDER.map((key) => {
          const model = WHISPER_MODELS[key];
          const isSelected = selected === key;
          const isLoaded = currentlyLoaded === model.id;
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onSelect(key)}
              disabled={disabled}
              className="relative text-left p-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSelected
                  ? "oklch(60% 0.20 290 / 0.10)"
                  : "oklch(24% 0.025 280 / 0.65)",
                border: isSelected
                  ? "1px solid oklch(60% 0.20 290 / 0.50)"
                  : "1px solid oklch(38% 0.02 280 / 0.35)",
              }}
            >
              <ModelBadge
                isSelected={isSelected}
                isLoaded={isLoaded}
                badge={model.badge}
              />
              <div className="font-semibold text-[14px] leading-tight" style={{ color: "var(--text)" }}>
                {model.name.replace("Whisper ", "")}
              </div>
              <div
                className="font-mono text-[10px] tracking-[0.06em] mt-0.5 mb-2.5"
                style={{ color: "oklch(55% 0.02 280)" }}
              >
                {model.size}
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                <ChipTag label={model.speed} />
                <ChipTag label={model.quality} />
              </div>
              <p
                className="text-[11.5px] leading-snug"
                style={{ color: "var(--text-muted)" }}
              >
                {model.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ChipTag({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded font-mono text-[9.5px] tracking-[0.04em]"
      style={{
        background: "oklch(30% 0.02 280 / 0.6)",
        color: "oklch(70% 0.02 280)",
        border: "1px solid oklch(38% 0.02 280 / 0.4)",
      }}
    >
      {label}
    </span>
  );
}

function ModelBadge({
  isSelected,
  isLoaded,
  badge,
}: {
  isSelected: boolean;
  isLoaded: boolean;
  badge: string | null;
}) {
  // Priority: LOADED > selected's badge > unselected's badge.
  let text: string | null = null;
  let style: React.CSSProperties | null = null;

  if (isLoaded) {
    text = "Loaded";
    style = {
      background: "oklch(70% 0.18 155 / 0.18)",
      color: "oklch(82% 0.14 155)",
      border: "1px solid oklch(70% 0.18 155 / 0.30)",
    };
  } else if (badge === "Best") {
    text = "Best";
    style = isSelected
      ? { background: "oklch(60% 0.20 290)", color: "#fff" }
      : {
          background: "oklch(60% 0.20 290 / 0.18)",
          color: "oklch(78% 0.10 290)",
          border: "1px solid oklch(60% 0.20 290 / 0.30)",
        };
  } else if (badge === "Fast") {
    text = "Fast";
    style = {
      background: "oklch(66% 0.17 195 / 0.18)",
      color: "oklch(78% 0.14 195)",
      border: "1px solid oklch(66% 0.17 195 / 0.30)",
    };
  } else if (badge === "Popular") {
    text = "Popular";
    style = isSelected
      ? { background: "oklch(60% 0.20 290)", color: "#fff" }
      : {
          background: "oklch(60% 0.20 290 / 0.15)",
          color: "oklch(78% 0.10 290)",
          border: "1px solid oklch(60% 0.20 290 / 0.30)",
        };
  }

  if (!text) return null;

  return (
    <span
      className="absolute top-2 right-2 font-mono text-[9px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
      style={style as React.CSSProperties}
    >
      {text}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── CAPABILITY STAT TILES + GPU row ─────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function CapabilityStatTiles({
  caps,
  workers,
}: {
  caps: DetectedCaps | null;
  workers: number;
}) {
  const tiles: Array<{ value: string; label: string; color: string }> = [
    {
      value: caps ? String(caps.cpuThreads) : "—",
      label: "CPU threads",
      color: "oklch(74% 0.16 290)",
    },
    {
      value: caps?.gpu ? "✓" : "—",
      label: caps?.gpu ? "GPU ready" : "CPU only",
      color: caps?.gpu ? "oklch(66% 0.17 195)" : "oklch(60% 0.02 280)",
    },
    {
      value: caps && caps.ramGB > 0 ? String(caps.ramGB) : "—",
      label: "GB RAM",
      color: "oklch(72% 0.16 55)",
    },
    {
      value: workers ? String(workers) : "—",
      label: "Workers",
      color: "oklch(70% 0.18 155)",
    },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="p-3 rounded-lg text-center"
          style={{
            background: `${t.color.replace(")", " / 0.08)")}`,
            border: `1px solid ${t.color.replace(")", " / 0.22)")}`,
          }}
        >
          <div
            className="font-jazz leading-none"
            style={{ color: t.color, fontSize: 22, fontWeight: 700 }}
          >
            {t.value}
          </div>
          <div
            className="font-mono mt-1.5"
            style={{
              color: "var(--text-muted)",
              fontSize: 9.5,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function GpuAccelerationRow({ caps }: { caps: DetectedCaps | null }) {
  if (!caps?.gpu) return null;
  return (
    <div
      className="flex items-center justify-between gap-2 mt-3 px-3 py-2.5 rounded-lg"
      style={{
        background: "oklch(70% 0.18 155 / 0.06)",
        border: "1px solid oklch(70% 0.18 155 / 0.20)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "oklch(70% 0.18 155)",
            boxShadow: "0 0 6px oklch(70% 0.18 155)",
          }}
        />
        <span
          className="font-mono text-[10.5px] tracking-[0.10em] uppercase"
          style={{ color: "oklch(82% 0.14 155)" }}
        >
          GPU acceleration
        </span>
      </div>
      {caps.gpuDevice && (
        <span
          className="font-mono text-[10px] tracking-[0.04em] truncate min-w-0 text-right"
          style={{ color: "var(--text-muted)" }}
          title={caps.gpuDevice}
        >
          {caps.gpuDevice}
        </span>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── Inference device segmented control ──────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function InferenceDeviceControl({
  caps,
  value,
  onChange,
}: {
  caps: DetectedCaps | null;
  value: DevicePreference;
  onChange: (v: DevicePreference) => void;
}) {
  const options: Array<{ id: DevicePreference; label: string; sub?: string; disabled?: boolean }> = [
    { id: "auto", label: "Auto" },
    { id: "gpu", label: "GPU", sub: "WebGPU", disabled: !caps?.gpu },
    { id: "cpu", label: "CPU" },
  ];
  return (
    <div>
      <div className="text-[12.5px] font-semibold mb-2" style={{ color: "var(--text)" }}>
        Inference device
      </div>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !opt.disabled && onChange(opt.id)}
              disabled={opt.disabled}
              className="flex-1 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              style={{
                background: active ? "oklch(60% 0.20 290 / 0.18)" : "oklch(24% 0.025 280 / 0.65)",
                border: active
                  ? "1px solid oklch(60% 0.20 290 / 0.50)"
                  : "1px solid oklch(38% 0.02 280 / 0.35)",
                color: active ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {opt.label}
              {opt.sub && (
                <span
                  className="font-mono text-[9px] tracking-[0.06em] uppercase opacity-60"
                  style={{ color: active ? "var(--text-muted)" : "oklch(50% 0.02 280)" }}
                >
                  {opt.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── Worker-count slider ─────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function WorkerCountSlider({
  caps,
  value,
  onChange,
  useGPU,
}: {
  caps: DetectedCaps | null;
  value: number;
  onChange: (n: number) => void;
  useGPU: boolean;
}) {
  const max = caps?.maxWorkers || 4;
  const recommended = caps?.recommendedWorkers || 2;
  const min = 1;
  const clamped = Math.min(Math.max(value, min), max);
  const percent = ((clamped - min) / (max - min)) * 100;
  const memoryPerWorkerMB = useGPU ? 300 : 600;
  const estimatedMemoryGB = (clamped * memoryPerWorkerMB + 1000) / 1024;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>
          Parallel workers
        </span>
        <span
          className="font-mono text-[12px]"
          style={{ color: "oklch(72% 0.16 55)" }}
        >
          {clamped} / {max}
        </span>
      </div>

      <div className="relative h-1.5 rounded-full" style={{ background: "oklch(28% 0.025 280)" }}>
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, oklch(60% 0.20 290), oklch(72% 0.16 55))",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full pointer-events-none"
          style={{
            left: `calc(${percent}% - 7px)`,
            top: "50%",
            transform: "translateY(-50%)",
            background: "#fff",
            boxShadow: "0 0 0 4px oklch(72% 0.16 55 / 0.25)",
          }}
        />
      </div>

      <div className="flex justify-between mt-2.5">
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(50% 0.02 280)" }}
        >
          Conservative
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(72% 0.16 55)" }}
        >
          Recommended: {recommended}
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(50% 0.02 280)" }}
        >
          Maximum
        </span>
      </div>

      <div
        className="text-[11.5px] mt-2"
        style={{ color: "var(--text-muted)" }}
      >
        Estimated memory usage: ~{estimatedMemoryGB.toFixed(1)} GB
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── Preview pane ────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function PreviewPane({ file }: { file: File }) {
  const [duration, setDuration] = useState<string>("--:--");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isVideo && !isAudio) return;
    const el = isVideo ? document.createElement("video") : document.createElement("audio");
    el.preload = "metadata";
    el.src = url;
    const handler = () => {
      const total = el.duration;
      if (!isFinite(total)) return;
      const mm = Math.floor(total / 60);
      const ss = Math.floor(total % 60);
      setDuration(`${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
    };
    el.addEventListener("loadedmetadata", handler);
    return () => {
      el.removeEventListener("loadedmetadata", handler);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "oklch(22% 0.025 280 / 0.55)",
        border: "1px solid oklch(38% 0.02 280 / 0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid oklch(38% 0.02 280 / 0.35)" }}
      >
        <div className={SECTION_LABEL} style={{ color: "var(--text-muted)" }}>
          Preview
        </div>
        <div
          className="font-mono text-[10.5px] tracking-[0.06em]"
          style={{ color: "var(--text-muted)" }}
        >
          00:00 / {duration}
        </div>
      </div>
      <div className="p-2">
        <MediaPreview file={file} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* ── Floating bottom action bar ──────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── */

function FloatingActionBar({
  label,
  onCta,
  ctaDisabled,
}: {
  label: string;
  onCta: () => void;
  ctaDisabled?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="fixed left-1/2 z-[60] flex items-stretch gap-2 -translate-x-1/2"
      style={{
        bottom: 14,
        padding: 4,
        paddingLeft: 14,
        borderRadius: 999,
        background: "oklch(14% 0.02 280 / 0.85)",
        border: "1px solid oklch(38% 0.02 280 / 0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="hidden md:flex items-center gap-2.5 pr-2 font-mono text-[11px] tracking-[0.06em]"
        style={{ color: "var(--text-muted)" }}
      >
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        <span>navigate</span>
        <span style={{ color: "oklch(38% 0.02 280)" }}>·</span>
        <Kbd>1</Kbd>
        <span style={{ color: "oklch(45% 0.02 280)" }}>–</span>
        <Kbd>4</Kbd>
        <span>jump</span>
        <span style={{ color: "oklch(38% 0.02 280)" }}>·</span>
        <span style={{ color: "oklch(55% 0.02 280)" }}>
          {size.w}×{size.h}
        </span>
      </div>
      <button
        type="button"
        onClick={onCta}
        disabled={ctaDisabled}
        className="flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          background: "linear-gradient(90deg, oklch(60% 0.20 290), oklch(66% 0.17 195))",
          border: "1px solid oklch(100% 0 0 / 0.18)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          boxShadow:
            "0 12px 30px oklch(60% 0.20 290 / 0.35), inset 0 1px 0 oklch(100% 0 0 / 0.20)",
        }}
      >
        <Zap className="w-4 h-4" />
        <span>{label}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="font-mono inline-flex items-center justify-center"
      style={{
        padding: "2px 6px",
        borderRadius: 4,
        background: "oklch(100% 0 0 / 0.06)",
        border: "1px solid oklch(100% 0 0 / 0.10)",
        color: "var(--text)",
        fontSize: 10,
        minWidth: 18,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  );
}
