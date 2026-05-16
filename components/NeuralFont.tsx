"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

// ── Types ────────────────────────────────────────────────────────────────────

type NodePoint = {
  x: number;
  y: number;
  isTeal: boolean;
  isHub: boolean;
  isOutline: boolean;
};

type EdgeData = {
  d: string;
  x1: number; y1: number;
  cpx: number; cpy: number;
  x2: number; y2: number;
  isLong: boolean;
};

type GraphData = {
  nodes: NodePoint[];
  edges: EdgeData[];
  pulseEdges: EdgeData[];
  width: number;
  height: number;
};

export interface NeuralFontProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  className?: string;
  style?: React.CSSProperties;
}

function makeCurvedPath(
  x1: number, y1: number,
  x2: number, y2: number,
  ni: number, nj: number,
  isLong: boolean,
): { d: string; cpx: number; cpy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.1) {
    const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    return { d: `M ${x1} ${y1} L ${x2} ${y2}`, cpx: mid.x, cpy: mid.y };
  }

  const nx = -dy / len;
  const ny = dx / len;
  const curveFactor = isLong ? 0.22 : 0.12;
  const dir = (ni * 31 + nj * 17) % 2 === 0 ? 1 : -1;
  const offset = len * curveFactor * dir;
  const cpx = (x1 + x2) / 2 + nx * offset;
  const cpy = (y1 + y2) / 2 + ny * offset;

  return {
    d: `M ${x1} ${y1} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${x2} ${y2}`,
    cpx,
    cpy,
  };
}

function sampleBezier(
  x1: number, y1: number,
  cpx: number, cpy: number,
  x2: number, y2: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cpx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cpy + t * t * y2,
  };
}

async function buildGraph(text: string, fontSize: number, fontFamily: string, letterSpacing: number): Promise<GraphData> {
  await document.fonts.ready;

  const padding = fontSize * 0.15;
  const canvasHeight = Math.ceil(fontSize * 1.5);

  // Measure text width precisely
  const tmp = document.createElement("canvas");
  const tmpCtx = tmp.getContext("2d")!;
  tmpCtx.font = `800 ${fontSize}px ${fontFamily}, sans-serif`;
  (tmpCtx as any).letterSpacing = `${letterSpacing}px`;
  const canvasWidth = Math.ceil(tmpCtx.measureText(text).width + padding * 2);

  // Render white text on black canvas — used as a pixel stencil
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `800 ${fontSize}px ${fontFamily}, sans-serif`;
  (ctx as any).letterSpacing = `${letterSpacing}px`;
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.fillText(text, padding, canvasHeight / 2);

  const pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

  const getAlpha = (x: number, y: number): number => {
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return 0;
    return pixels[(y * canvasWidth + x) * 4 + 3];
  };

  // Node spacing — fontSize/10 balances readability vs density
  const step = Math.max(5, Math.round(fontSize / 11));
  const nodes: NodePoint[] = [];

  for (let y = step; y < canvasHeight - step; y += step) {
    for (let x = step; x < canvasWidth - step; x += step) {
      const alpha = getAlpha(x, y);
      if (alpha > 110) {
        // Outline = filled pixel with at least one empty neighbor
        const isOutline =
          getAlpha(x - step, y) < 110 ||
          getAlpha(x + step, y) < 110 ||
          getAlpha(x, y - step) < 110 ||
          getAlpha(x, y + step) < 110;

        const gx = Math.floor(x / step);
        const gy = Math.floor(y / step);
        nodes.push({
          x, y,
          isTeal: (gx * 3 + gy * 7) % 17 === 0,
          isHub:  (gx * 5 + gy * 11) % 9 === 0,
          isOutline,
        });
      }
    }
  }

  const shortRange = step * 2.0;
  const medRange   = step * 4.5;
  const cellSize   = medRange;

  const grid = new Map<string, number[]>();
  nodes.forEach((node, i) => {
    const key = `${Math.floor(node.x / cellSize)},${Math.floor(node.y / cellSize)}`;
    const bucket = grid.get(key) ?? [];
    bucket.push(i);
    grid.set(key, bucket);
  });

  const edgeSet = new Set<string>();
  const edges: EdgeData[] = [];

  const addEdge = (i: number, j: number, isLong: boolean) => {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    const n1 = nodes[i];
    const n2 = nodes[j];
    const { d, cpx, cpy } = makeCurvedPath(n1.x, n1.y, n2.x, n2.y, i, j, isLong);
    edges.push({ d, x1: n1.x, y1: n1.y, cpx, cpy, x2: n2.x, y2: n2.y, isLong });
  };

  nodes.forEach((node, i) => {
    const cx = Math.floor(node.x / cellSize);
    const cy = Math.floor(node.y / cellSize);
    const maxDendrites = node.isHub ? 5 : node.isOutline ? 4 : 3;

    type Cand = [number, number];
    const short: Cand[] = [];
    const medium: Cand[] = [];

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (const j of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (j === i) continue;
          const ddx = node.x - nodes[j].x;
          const ddy = node.y - nodes[j].y;
          const dist2 = ddx * ddx + ddy * ddy;
          if (dist2 < shortRange * shortRange) short.push([j, dist2]);
          else if (dist2 < medRange * medRange) medium.push([j, dist2]);
        }
      }
    }

    short.sort((a, b) => a[1] - b[1]);
    short.slice(0, maxDendrites).forEach(([j]) => addEdge(i, j, false));

    if ((i * 13 + 5) % 3 !== 0 && medium.length > 0) {
      addEdge(i, medium[(i * 7) % medium.length][0], false);
    }
  });

  // Sparse long-range axons
  if (nodes.length >= 6) {
    const stride = Math.max(3, Math.floor(nodes.length / 14));
    for (let i = 0; i < nodes.length; i += stride) {
      const j = Math.floor((i * 7 + nodes.length * 0.38) % nodes.length);
      if (i !== j) addEdge(i, j, true);
    }
  }

  const pulseEdges = edges.filter((_, i) => i % 10 === 0).slice(0, 30);
  return { nodes, edges, pulseEdges, width: canvasWidth, height: canvasHeight };
}

export default function NeuralFont({
  text,
  fontSize = 100,
  fontFamily = "Syne",
  letterSpacing = 0,
  className = "",
  style,
}: NeuralFontProps) {
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildGraph(text, fontSize, fontFamily, letterSpacing).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => { cancelled = true; };
  }, [text, fontSize, fontFamily, letterSpacing]);

  const outlineViolet  = useMemo(() => data?.nodes.filter((n) => n.isOutline && !n.isTeal && !n.isHub) ?? [], [data]);
  const interiorViolet = useMemo(() => data?.nodes.filter((n) => !n.isOutline && !n.isTeal && !n.isHub) ?? [], [data]);
  const outlineTeal    = useMemo(() => data?.nodes.filter((n) => n.isOutline && n.isTeal && !n.isHub) ?? [], [data]);
  const interiorTeal   = useMemo(() => data?.nodes.filter((n) => !n.isOutline && n.isTeal && !n.isHub) ?? [], [data]);
  const hubs           = useMemo(() => data?.nodes.filter((n) => n.isHub) ?? [], [data]);

  const sparkKeyframes = useMemo(
    () => (data?.pulseEdges ?? []).map((edge) =>
      [0, 0.25, 0.5, 0.75, 1].map((t) =>
        sampleBezier(edge.x1, edge.y1, edge.cpx, edge.cpy, edge.x2, edge.y2, t),
      ),
    ),
    [data],
  );

  if (!data) {
    return (
      <div className={`flex items-center ${className}`} style={style}>
        <span className="opacity-0 font-extrabold select-none" style={{ fontSize }}>{text}</span>
      </div>
    );
  }

  return (
    <motion.svg
      viewBox={`0 0 ${data.width} ${data.height}`}
      width="100%"
      className={className}
      style={style}
      role="heading"
      aria-label={text}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <defs>
        <filter id="ngf-edge-glow" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ngf-node-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ngf-outline-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ngf-hub-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ngf-spark-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Interior dendrites */}
      <g filter="url(#ngf-edge-glow)">
        {data.edges.filter((e) => !e.isLong).map((edge, i) => (
          <path key={i} d={edge.d} stroke="oklch(0.82 0.18 290)" strokeWidth="0.9" fill="none" opacity="0.36" />
        ))}
      </g>

      {/* Long-range axons */}
      <g filter="url(#ngf-edge-glow)">
        {data.edges.filter((e) => e.isLong).map((edge, i) => (
          <path key={`ax-${i}`} d={edge.d} stroke="oklch(0.84 0.15 195)" strokeWidth="0.7" fill="none" opacity="0.22" />
        ))}
      </g>

      {/* Interior violet nodes */}
      <g filter="url(#ngf-node-glow)">
        {interiorViolet.map((node, i) => (
          <circle key={`iv-${i}`} cx={node.x} cy={node.y} r={1.8} fill="oklch(0.84 0.20 290)" opacity={0.72} />
        ))}
      </g>

      {/* Interior teal nodes (pulsing) */}
      <g filter="url(#ngf-node-glow)">
        {interiorTeal.map((node, i) => (
          <motion.circle key={`it-${i}`} cx={node.x} cy={node.y} fill="oklch(0.86 0.16 195)"
            animate={{ r: [1.8, 3.0, 1.8], opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 2.0 + (i % 7) * 0.45, repeat: Infinity, delay: (i % 23) * 0.18, ease: "easeInOut" }}
          />
        ))}
      </g>

      {/* Outline violet nodes — define letter edges */}
      <g filter="url(#ngf-outline-glow)">
        {outlineViolet.map((node, i) => (
          <motion.circle key={`ov-${i}`} cx={node.x} cy={node.y} fill="oklch(0.90 0.20 290)"
            animate={{ r: [2.6, 3.6, 2.6], opacity: [0.88, 1, 0.88] }}
            transition={{ duration: 2.2 + (i % 5) * 0.3, repeat: Infinity, delay: (i % 17) * 0.12, ease: "easeInOut" }}
          />
        ))}
      </g>

      {/* Outline teal nodes */}
      <g filter="url(#ngf-outline-glow)">
        {outlineTeal.map((node, i) => (
          <motion.circle key={`ot-${i}`} cx={node.x} cy={node.y} fill="oklch(0.92 0.16 195)"
            animate={{ r: [2.8, 4.0, 2.8], opacity: [0.80, 1, 0.80] }}
            transition={{ duration: 1.8 + (i % 6) * 0.4, repeat: Infinity, delay: (i % 19) * 0.15, ease: "easeInOut" }}
          />
        ))}
      </g>

      {/* Hub neurons */}
      <g filter="url(#ngf-hub-glow)">
        {hubs.map((node, i) => (
          <motion.circle key={`hub-${i}`} cx={node.x} cy={node.y}
            fill={node.isTeal ? "oklch(0.90 0.15 195)" : "oklch(0.88 0.20 290)"}
            animate={{ r: [3.8, 6.0, 3.8], opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.5 + (i % 5) * 0.55, repeat: Infinity, delay: i * 0.28, ease: "easeInOut" }}
          />
        ))}
      </g>

      {/* Amber sparks traveling along bezier paths */}
      {sparkKeyframes.map((samples, i) => (
        <motion.circle key={`spark-${i}`} r={3.0} fill="oklch(0.94 0.15 55)" filter="url(#ngf-spark-glow)"
          animate={{ cx: samples.map((p) => p.x), cy: samples.map((p) => p.y), opacity: [0, 0.95, 1, 0.95, 0] }}
          transition={{ duration: 1.6 + (i % 6) * 0.3, repeat: Infinity, delay: i * 0.36, ease: "linear" }}
        />
      ))}
    </motion.svg>
  );
}
