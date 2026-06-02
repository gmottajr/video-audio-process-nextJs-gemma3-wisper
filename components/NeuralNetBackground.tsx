"use client";

import { useEffect, useRef } from "react";

// ── OKLAB COLOR SCIENCE ────────────────────────────────────────────────────
// OKLAB is a perceptually uniform color space by Björn Ottosson (2020).
// Equal steps in OKLAB look equally different to the human eye —
// unlike sRGB or HSL which are perceptually non-uniform.

type RGB = { r: number; g: number; b: number };
type Lab = { L: number; a: number; b: number };

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;
}
function clamp255(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}
function rgbToOklab({ r, g, b }: RGB): Lab {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L:  0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a:  1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b:  0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}
function oklabToRgb({ L, a, b }: Lab): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return {
    r: clamp255(linearToSrgb( 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp255(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp255(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)),
  };
}

/** Perceptually uniform interpolation between two sRGB colors via OKLAB. */
function lerpOklab(a: RGB, b: RGB, t: number): RGB {
  const la = rgbToOklab(a), lb = rgbToOklab(b);
  return oklabToRgb({
    L: la.L + (lb.L - la.L) * t,
    a: la.a + (lb.a - la.a) * t,
    b: la.b + (lb.b - la.b) * t,
  });
}
function rgba({ r, g, b }: RGB, alpha: number): string {
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ── PALETTE — Galaxy / nebula color system ────────────────────────────────
// High-chroma colors inspired by deep-space imagery:
// electric violet, nebula magenta, cosmic blue, bright cyan, star gold, deep indigo.
// All hues are 60°+ apart so OKLAB blends between any two stay vivid.
const PALETTE: RGB[] = [
  { r: 148, g:  68, b: 255 }, // Electric Violet  oklch(60% 0.30 290)
  { r: 228, g:  48, b: 198 }, // Nebula Magenta   oklch(58% 0.28 328)
  { r:  38, g: 128, b: 255 }, // Cosmic Blue      oklch(62% 0.22 248)
  { r:   0, g: 220, b: 235 }, // Bright Cyan      oklch(83% 0.16 192)
  { r: 255, g: 195, b:  28 }, // Star Gold        oklch(84% 0.19  88)
  { r:  98, g:  28, b: 255 }, // Deep Indigo      oklch(45% 0.32 284)
];

// Activation / firing color — near-white starlight burst
const ACTIVATION_COLOR: RGB = { r: 255, g: 245, b: 220 };

// ── TYPES ──────────────────────────────────────────────────────────────────

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  /** Z-depth: 0 = far (dim, small), 1 = close (bright, large) */
  z: number;
  /** Slow Z drift — nodes float toward/away from viewer */
  vz: number;
  radius: number;
  colorIdx: number;
  /** Mouse-proximity activation, 0 (resting) → 1 (firing). Lerps smoothly. */
  activation: number;
  /** Connection count this frame — used for degree-centrality coloring. */
  degree: number;
}

interface Pulse {
  from: number; to: number;
  t: number;       // 0..1 travel progress
  speed: number;
  ca: RGB; cb: RGB; // node colors at spawn time
  zFrom: number; zTo: number; // node depths at spawn time
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const NODE_COUNT   = 46;
const MAX_DIST     = 210;
const MAX_DIST_SQ  = MAX_DIST * MAX_DIST;
const MOUSE_RADIUS = 160;
const HUB_DEGREE   = 4;   // connections above this = hub node → warmer color

// ── COMPONENT ──────────────────────────────────────────────────────────────

export function NeuralNetBackground() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const mouseRef       = useRef({ x: -9999, y: -9999 });
  const scrollDepthRef = useRef(0); // 0 = surface, 1 = deepest section

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let nodes:  Node[]  = [];
    let pulses: Pulse[] = [];

    // Track scroll progress independently — no prop threading needed
    const onScroll = () => {
      const maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollDepthRef.current = window.scrollY / maxY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x:          Math.random() * canvas.width,
        y:          Math.random() * canvas.height,
        vx:         (Math.random() - 0.5) * 0.32,
        vy:         (Math.random() - 0.5) * 0.32,
        z:          Math.random(),           // initial depth
        vz:         (Math.random() - 0.5) * 0.0018, // slow depth drift
        radius:     Math.random() * 1.6 + 1.0,
        colorIdx:   Math.floor(Math.random() * PALETTE.length),
        activation: 0,
        degree:     0,
      }));
    };

    const spawnPulse = () => {
      const ai = Math.floor(Math.random() * nodes.length);
      const bi = Math.floor(Math.random() * nodes.length);
      if (ai === bi) return;
      const a = nodes[ai], b = nodes[bi];
      const dx = a.x - b.x, dy = a.y - b.y;
      if (dx * dx + dy * dy < MAX_DIST_SQ) {
        pulses.push({
          from: ai, to: bi, t: 0,
          speed: 0.005 + Math.random() * 0.009,
          ca: PALETTE[a.colorIdx], cb: PALETTE[b.colorIdx],
          zFrom: a.z, zTo: b.z,
        });
      }
    };

    let lastPulse = 0;

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Slow sinusoidal vibrancy breath — each term uses a prime-ratio period
      // so they never perfectly align → always feels organic and non-repetitive.
      const breathe =
        0.55 +
        0.20 * Math.sin(ts * 0.00031) +   // 20s cycle
        0.15 * Math.sin(ts * 0.00019) +   // 33s cycle
        0.10 * Math.sin(ts * 0.00047);    // 13s cycle
      // breathe range: ~0.30 (dim) → ~1.00 (full vivid)

      // Scroll depth: 0 = surface level, 1 = diving deepest
      // As the user dives deeper, the network becomes more excited:
      // - Z-drift variance expands → nodes spread across more depth planes
      // - Pulse spawn rate increases → network feels more active at depth
      const depth = scrollDepthRef.current;
      const zScale = 1 + depth * 2.2; // drift up to 3.2× faster at max depth

      // Apply dynamic Z-drift multiplier to every node
      for (const n of nodes) {
        n.vz = Math.sign(n.vz) * Math.min(Math.abs(n.vz) * zScale, 0.006);
      }

      // Pulse spawn — more frequent as depth increases
      const pulseInterval = Math.max(60, 200 - depth * 130);
      if (ts - lastPulse > pulseInterval) {
        const count = 3 + Math.floor(Math.random() * 3) + Math.floor(depth * 4);
        for (let i = 0; i < count; i++) spawnPulse();
        lastPulse = ts;
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Update node state (position, Z-depth, activation)
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0)             { n.x = 0;             n.vx *= -1; }
        if (n.x > canvas.width)  { n.x = canvas.width;  n.vx *= -1; }
        if (n.y < 0)             { n.y = 0;             n.vy *= -1; }
        if (n.y > canvas.height) { n.y = canvas.height; n.vy *= -1; }

        // Z drift — slowly float toward/away from viewer
        n.z += n.vz;
        if (n.z < 0) { n.z = 0; n.vz *= -1; }
        if (n.z > 1) { n.z = 1; n.vz *= -1; }

        // Mouse activation
        const mdist  = Math.hypot(n.x - mx, n.y - my);
        const target = mdist < MOUSE_RADIUS ? 1 - mdist / MOUSE_RADIUS : 0;
        n.activation += (target - n.activation) * 0.07;
        n.degree = 0;
      }

      // ── Draw connections with Z-depth perspective + OKLAB color blend
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dSq = dx * dx + dy * dy;
          if (dSq >= MAX_DIST_SQ) continue;

          nodes[i].degree++;
          nodes[j].degree++;

          const proximity = 1 - Math.sqrt(dSq) / MAX_DIST;
          const boost     = Math.max(a.activation, b.activation);

          // ── Z-DEPTH PERSPECTIVE ──
          // Average depth of the two endpoints.
          // Close connections (z≈1) are thick and bright.
          // Far connections (z≈0) are hairline and nearly invisible.
          const zPair     = (a.z + b.z) * 0.5;
          const zFactor   = 0.15 + zPair * 0.85;  // 0.15 (far) → 1.0 (close)

          const alpha     = proximity * (0.40 + boost * 1.0) * zFactor * breathe;
          ctx.lineWidth   = (0.6 + zPair * 3.8) * (1 + boost * 1.4);

          const ca = PALETTE[a.colorIdx];
          const cb = PALETTE[b.colorIdx];

          // OKLAB gradient — 3 perceptually uniform stops
          const mid  = lerpOklab(ca, cb, 0.5);
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0,   rgba(ca,  alpha));
          grad.addColorStop(0.5, rgba(mid, alpha));
          grad.addColorStop(1,   rgba(cb,  alpha));

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.stroke();
        }
      }

      // ── Draw pulses with additive light compositing + Z-depth scaling
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      pulses = pulses.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) return false;

        const na = nodes[p.from], nb = nodes[p.to];
        const dx = na.x - nb.x, dy = na.y - nb.y;
        if (dx * dx + dy * dy >= MAX_DIST_SQ) return false;

        const px = na.x + (nb.x - na.x) * p.t;
        const py = na.y + (nb.y - na.y) * p.t;

        // Color at this point in the journey — OKLAB lerp
        const c = lerpOklab(p.ca, p.cb, p.t);

        // Z-depth: pulses on close connections are large bright blobs;
        // far pulses are small dim sparks.
        const zNow   = p.zFrom + (p.zTo - p.zFrom) * p.t;
        const glowR  = (5 + zNow * 10);  // 5px far → 15px close
        const coreA  = 0.5 + zNow * 0.45;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        glow.addColorStop(0,   rgba(c, coreA));
        glow.addColorStop(0.4, rgba(c, coreA * 0.3));
        glow.addColorStop(1,   rgba(c, 0));
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        const coreR = 1.2 + zNow * 1.8; // core dot scales with depth
        ctx.beginPath();
        ctx.arc(px, py, coreR, 0, Math.PI * 2);
        ctx.fillStyle = rgba(c, 0.95);
        ctx.fill();

        return true;
      });

      ctx.restore();

      // ── Draw nodes — size, glow, and alpha all scale with Z-depth
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (const n of nodes) {
        const base = PALETTE[n.colorIdx];

        // Degree centrality: hub nodes (many connections) → blend toward activation color
        const hubT      = Math.min(n.degree / HUB_DEGREE, 1) * 0.55;
        const actT      = n.activation * 0.70;
        const nodeColor = lerpOklab(lerpOklab(base, ACTIVATION_COLOR, hubT), ACTIVATION_COLOR, actT);

        // Z-depth scales everything: far nodes are small and faint
        const zScale = 0.40 + n.z * 1.1;  // 0.40 (far) → 1.50 (close)
        const gSize  = n.radius * (9 + n.activation * 20 + (n.degree / HUB_DEGREE) * 6) * zScale;
        const alpha  = (0.60 + n.activation * 0.60 + Math.min(n.degree / HUB_DEGREE, 1) * 0.22) * zScale * breathe;

        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gSize);
        halo.addColorStop(0,   rgba(nodeColor, Math.min(alpha, 0.95)));
        halo.addColorStop(0.5, rgba(nodeColor, Math.min(alpha * 0.3, 0.5)));
        halo.addColorStop(1,   rgba(nodeColor, 0));
        ctx.beginPath();
        ctx.arc(n.x, n.y, gSize, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        const coreR = (n.radius + n.activation * 1.8) * zScale;
        ctx.beginPath();
        ctx.arc(n.x, n.y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = rgba(nodeColor, Math.min(0.85 * zScale, 0.95));
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    const onMouseMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onMouseLeave = ()               => { mouseRef.current = { x: -9999, y: -9999 }; };

    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("resize",     resize);

    init();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize",     resize);
      window.removeEventListener("scroll",     onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1 }}
      aria-hidden
    />
  );
}
