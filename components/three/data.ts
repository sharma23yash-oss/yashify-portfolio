/**
 * Shared, three.js-free data for the 3D scenes and their static posters.
 *
 * Everything here is generated from fixed seeds, so the picture is identical on every
 * visit. It is decorative and illustrative only: the candles are not real prices and the
 * mesh is not a real pipeline diagram. Nothing in this file imports three.js, so it is
 * safe to ship in the main bundle (the posters need it before any 3D code loads).
 */

export const PALETTE = {
  navy: '#0B1F3A',
  navySoft: '#14305A',
  cobalt: '#3054A8',
  teal: '#14B8A6',
  tealLight: '#2DD4BF',
  tealDeep: '#0D9488',
  emerald: '#34D399',
  slate: '#64748B',
  slateLight: '#CBD5E1',
  paper: '#FAFAFA',
} as const;

/** Small seeded random number generator (mulberry32): same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------ candlestick data ------------------------------ */

export type Candle = {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number; // 0.15 to 1, relative
  up: boolean;
};

/** Drift per candle: a rally, one healthy pullback in the middle, then a breakout. */
function driftAt(progress: number): number {
  if (progress < 0.38) return 0.034;
  if (progress < 0.55) return -0.022;
  return 0.036;
}

export function buildCandles(count: number, seed: number): Candle[] {
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < count; i += 1) {
    const open = price;
    const change = driftAt(i / (count - 1)) + (rand() - 0.5) * 0.1; // trend plus noise
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + 0.004 + rand() * 0.026);
    const low = Math.min(open, close) * (1 - 0.004 - rand() * 0.026);
    const volume = Math.min(1, 0.18 + rand() * 0.45 + (Math.abs(change) / 0.05) * 0.3);
    candles.push({ open, close, high, low, volume, up: close >= open });
    price = close;
  }
  return candles;
}

/** Joins every `factor` neighbouring candles into one (used for the lighter phone version). */
export function mergeCandles(series: Candle[], factor: number): Candle[] {
  const merged: Candle[] = [];
  for (let i = 0; i < series.length; i += factor) {
    const group = series.slice(i, i + factor);
    const open = group[0].open;
    const close = group[group.length - 1].close;
    merged.push({
      open,
      close,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      volume: Math.min(1, group.reduce((sum, c) => sum + c.volume, 0) / group.length + 0.08),
      up: close >= open,
    });
  }
  return merged;
}

/** Exponential moving average of the closes: the glowing trend line. */
export function trendLine(series: Candle[], alpha = 0.3): number[] {
  const line: number[] = [];
  let ema = series[0].open;
  for (const candle of series) {
    ema += (candle.close - ema) * alpha;
    line.push(ema);
  }
  return line;
}

export const CANDLE_SEED = 258;
export const CANDLES_FULL = buildCandles(24, CANDLE_SEED);
export const CANDLES_LITE = mergeCandles(CANDLES_FULL, 2);

/* -------------------------------- data mesh data ------------------------------- */

export type MeshKind = 'block' | 'orb';

export type MeshLayer = {
  count: number;
  kind: MeshKind;
  size: number; // relative size
  color: string;
};

/** Left to right: source tables, scripts, features, models, valuation output. */
export const MESH_LAYERS: readonly MeshLayer[] = [
  { count: 6, kind: 'block', size: 0.9, color: PALETTE.navy },
  { count: 8, kind: 'orb', size: 0.75, color: PALETTE.teal },
  { count: 6, kind: 'block', size: 1.0, color: PALETTE.cobalt },
  { count: 4, kind: 'orb', size: 1.2, color: PALETTE.tealDeep },
  { count: 2, kind: 'block', size: 1.7, color: PALETTE.emerald },
];

export type MeshNode = {
  id: number;
  layer: number;
  kind: MeshKind;
  size: number;
  color: string;
  x: number; // -1 to 1 across the width
  y: number; // -1 to 1 down the height
  z: number; // -1 to 1 depth
  phase: number; // for the gentle breathing
};

export type MeshEdge = readonly [from: number, to: number];

export function buildMesh(seed: number): { nodes: MeshNode[]; edges: MeshEdge[] } {
  const rand = mulberry32(seed);
  const nodes: MeshNode[] = [];
  const layerCount = MESH_LAYERS.length;

  MESH_LAYERS.forEach((layer, l) => {
    for (let j = 0; j < layer.count; j += 1) {
      const slot = (j + 0.5) / layer.count; // even spread down the layer, then jittered
      nodes.push({
        id: nodes.length,
        layer: l,
        kind: layer.kind,
        size: layer.size * (0.85 + rand() * 0.3),
        color: layer.color,
        x: -0.94 + (1.88 * l) / (layerCount - 1) + (rand() - 0.5) * 0.08,
        y: (slot * 2 - 1) * 0.92 + (rand() - 0.5) * (0.9 / layer.count),
        z: (rand() * 2 - 1) * 0.85,
        phase: rand() * Math.PI * 2,
      });
    }
  });

  const edges: MeshEdge[] = [];
  const seen = new Set<string>();
  const link = (from: number, to: number) => {
    const key = `${from}-${to}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push([from, to]);
    }
  };
  const distance = (a: MeshNode, b: MeshNode) => Math.hypot(a.y - b.y, (a.z - b.z) * 0.6);

  for (let l = 0; l < layerCount - 1; l += 1) {
    const from = nodes.filter((n) => n.layer === l);
    const to = nodes.filter((n) => n.layer === l + 1);
    // every node reaches its two nearest neighbours in the next layer ...
    from.forEach((a) => {
      [...to]
        .sort((p, q) => distance(a, p) - distance(a, q))
        .slice(0, 2)
        .forEach((b) => link(a.id, b.id));
    });
    // ... and nothing in the next layer is left without an input
    to.forEach((b) => {
      if (!edges.some(([, target]) => target === b.id)) {
        const nearest = [...from].sort((p, q) => distance(b, p) - distance(b, q))[0];
        link(nearest.id, b.id);
      }
    });
  }

  return { nodes, edges };
}

export const MESH_SEED = 11;
export const MESH = buildMesh(MESH_SEED);
