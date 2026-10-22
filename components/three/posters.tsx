/**
 * Static pictures shown instead of the 3D scenes (reduced motion, data saver, no WebGL,
 * or if the 3D code fails). Plain SVG in the same palette and built from the same data as
 * the scenes, so the page looks the same shape with and without WebGL. No animation.
 */

import { CANDLES_FULL, MESH, PALETTE, trendLine } from './data';

/* ------------------------------- candlestick poster ------------------------------ */

const CW = 1000;
const CH = 640;
const C_LEFT = 90;
const C_RIGHT = CW - 70;
const C_TOP = 70;
const C_BOTTOM = 470;
const CANDLE_LOW = Math.min(...CANDLES_FULL.map((c) => c.low));
const CANDLE_HIGH = Math.max(...CANDLES_FULL.map((c) => c.high));
const PITCH = (C_RIGHT - C_LEFT) / CANDLES_FULL.length;

const priceY = (price: number) => C_BOTTOM - ((price - CANDLE_LOW) / (CANDLE_HIGH - CANDLE_LOW)) * (C_BOTTOM - C_TOP);
const candleX = (i: number) => C_LEFT + (i + 0.5) * PITCH;

const TREND_POINTS = trendLine(CANDLES_FULL)
  .map((price, i) => `${candleX(i).toFixed(1)},${priceY(price).toFixed(1)}`)
  .join(' ');

export function MarketTrendPoster() {
  return (
    <svg
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      focusable="false"
    >
      <defs>
        <linearGradient id="ys3d-trend" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PALETTE.navy} />
          <stop offset="0.55" stopColor={PALETTE.teal} />
          <stop offset="1" stopColor={PALETTE.emerald} />
        </linearGradient>
      </defs>

      <rect x="40" y="30" width={CW - 80} height={CH - 90} rx="10" fill="#FFFFFF" fillOpacity="0.35" stroke={PALETTE.slate} strokeOpacity="0.4" />
      {[0, 1, 2, 3, 4].map((k) => (
        <line
          key={k}
          x1="60"
          x2={CW - 60}
          y1={C_TOP + ((C_BOTTOM - C_TOP) * k) / 4}
          y2={C_TOP + ((C_BOTTOM - C_TOP) * k) / 4}
          stroke={PALETTE.slate}
          strokeOpacity="0.2"
        />
      ))}

      {CANDLES_FULL.map((c, i) => {
        const x = candleX(i);
        const bodyTop = priceY(Math.max(c.open, c.close));
        const bodyBottom = priceY(Math.min(c.open, c.close));
        const fill = c.up ? PALETTE.tealLight : PALETTE.navy;
        return (
          <g key={i}>
            <rect x={x - 12} y={C_BOTTOM + 70 - c.volume * 55} width="24" height={c.volume * 55} fill={c.up ? '#99F6E4' : '#94A3B8'} fillOpacity="0.55" />
            <line x1={x} x2={x} y1={priceY(c.high)} y2={priceY(c.low)} stroke={PALETTE.navySoft} strokeWidth="3" />
            <rect
              x={x - 11}
              y={bodyTop}
              width="22"
              height={Math.max(bodyBottom - bodyTop, 4)}
              rx="2"
              fill={fill}
              fillOpacity={c.up ? 0.8 : 0.9}
              stroke="#17325A"
              strokeOpacity="0.55"
            />
          </g>
        );
      })}

      <polyline points={TREND_POINTS} fill="none" stroke="url(#ys3d-trend)" strokeOpacity="0.18" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={TREND_POINTS} fill="none" stroke="url(#ys3d-trend)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --------------------------------- data mesh poster -------------------------------- */

// Positions are percentages of the frame. The 3D scene also stretches the mesh to fit its
// frame, so this picture suits any shape: a tall hero gutter or a wide card alike.
const meshX = (x: number) => `${((0.5 + x * 0.43) * 100).toFixed(2)}%`;
const meshY = (y: number) => `${((0.5 + y * 0.44) * 100).toFixed(2)}%`;
const NODE_PX = 6; // node radius in pixels per unit of `size`

export function DataMeshPoster() {
  return (
    <svg className="h-full w-full" focusable="false">
      {MESH.edges.map(([from, to]) => {
        const a = MESH.nodes[from];
        const b = MESH.nodes[to];
        return (
          <line
            key={`${from}-${to}`}
            x1={meshX(a.x)}
            y1={meshY(a.y)}
            x2={meshX(b.x)}
            y2={meshY(b.y)}
            stroke={PALETTE.cobalt}
            strokeOpacity="0.32"
          />
        );
      })}
      {MESH.nodes.map((node) => {
        const r = node.size * NODE_PX;
        return node.kind === 'orb' ? (
          <circle key={node.id} cx={meshX(node.x)} cy={meshY(node.y)} r={r} fill={node.color} fillOpacity="0.9" />
        ) : (
          // a nested <svg> is how SVG places a shape at a percentage position
          <svg key={node.id} x={meshX(node.x)} y={meshY(node.y)} overflow="visible">
            <rect x={-r} y={-r} width={r * 2} height={r * 2} rx="2" fill={node.color} fillOpacity="0.9" />
          </svg>
        );
      })}
    </svg>
  );
}
