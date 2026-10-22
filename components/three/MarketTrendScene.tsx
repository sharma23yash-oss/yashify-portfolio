'use client';

/**
 * Scene 1: a floating glass-and-steel candlestick chart with a glowing bull-market trend
 * line. It turns and tilts with the pointer (see ParallaxRig in SceneCanvas).
 *
 * Draw calls are kept low on purpose: all candle bodies are ONE instanced mesh, all wicks
 * one, all volume bars one, and every candle outline lives in ONE line geometry that is
 * rewritten in place while the candles grow in. The prices are illustrative, not real.
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DynamicDrawUsage,
  EdgesGeometry,
  InstancedMesh,
  Object3D,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three';
import SceneCanvas, { ParallaxRig, StudioLights } from './SceneCanvas';
import type { SceneProps } from './SceneFrame';
import { CANDLES_FULL, CANDLES_LITE, PALETTE, trendLine, type Candle } from './data';

/* ---------------------------------- constants ---------------------------------- */

const CAMERA = { position: [0, 1.2, 15] as [number, number, number], fov: 28 };
const BASE_ROTATION: [number, number, number] = [0.1, -0.34, 0];

const PANEL_W = 11.6;
const PANEL_H = 7.0;
const PANEL_Z = -0.55;
const PLOT_W = 10.4;
const PRICE_BOTTOM = 1.45;
const PRICE_TOP = 6.35;
const VOLUME_TOP = 0.95;
const VOLUME_BASE = 0.3; // volume bars sit on the panel, just above its lower edge
const VOLUME_Z = -0.33;
const BODY_DEPTH = 0.24;
const WICK_WIDTH = 0.05;
const MIN_BODY = 0.05;
const TREND_Z = 0.3;

const INTRO_DELAY = 0.25; // seconds before the first candle grows
const STAGGER = 0.042; // seconds between neighbouring candles
const GROW_TIME = 0.75;
const TREND_START = 0.5;
const TREND_TIME = 2.0;

const COLOR_UP = new Color(PALETTE.tealLight);
const COLOR_DOWN = new Color(PALETTE.navy);
const COLOR_VOLUME_UP = new Color('#99F6E4');
const COLOR_VOLUME_DOWN = new Color('#94A3B8');
const TREND_STOPS = [new Color(PALETTE.navy), new Color(PALETTE.teal), new Color(PALETTE.emerald)];

const dummy = new Object3D();

/* ----------------------------------- layout ----------------------------------- */

type Slot = {
  x: number;
  bodyY: number;
  bodyH: number;
  wickY: number;
  wickH: number;
  volH: number;
  up: boolean;
};

type ChartLayout = {
  slots: Slot[];
  bodyW: number;
  trend: Vector3[];
  scale: number; // world units per price unit
  base: number; // price at PRICE_BOTTOM
};

function buildLayout(series: Candle[]): ChartLayout {
  const low = Math.min(...series.map((c) => c.low));
  const high = Math.max(...series.map((c) => c.high));
  const scale = (PRICE_TOP - PRICE_BOTTOM) / (high - low);
  const toY = (price: number) => PRICE_BOTTOM + (price - low) * scale;
  const pitch = PLOT_W / series.length;

  const slots = series.map((c, i): Slot => {
    const top = toY(Math.max(c.open, c.close));
    const bottom = toY(Math.min(c.open, c.close));
    const bodyH = Math.max(top - bottom, MIN_BODY);
    const wickLow = toY(c.low);
    const wickHigh = toY(c.high);
    return {
      x: -PLOT_W / 2 + (i + 0.5) * pitch,
      bodyY: (top + bottom) / 2,
      bodyH,
      wickY: (wickLow + wickHigh) / 2,
      wickH: wickHigh - wickLow,
      volH: 0.06 + c.volume * (VOLUME_TOP - 0.1),
      up: c.up,
    };
  });

  const trend = trendLine(series).map((price, i) => new Vector3(slots[i].x, toY(price), TREND_Z));
  return { slots, bodyW: pitch * 0.5, trend, scale, base: low };
}

/* ------------------------------- box outline data ------------------------------ */

const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
] as const;
const BOX_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
] as const;
const FLOATS_PER_BOX = BOX_EDGES.length * 2 * 3;

/** Writes the 12 edges of one box into the shared outline buffer (no allocations). */
function writeBoxEdges(
  out: Float32Array,
  slot: number,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  let o = slot * FLOATS_PER_BOX;
  for (let e = 0; e < BOX_EDGES.length; e += 1) {
    const a = CORNERS[BOX_EDGES[e][0]];
    const b = CORNERS[BOX_EDGES[e][1]];
    out[o++] = cx + a[0] * hx;
    out[o++] = cy + a[1] * hy;
    out[o++] = cz + a[2] * hz;
    out[o++] = cx + b[0] * hx;
    out[o++] = cy + b[1] * hy;
    out[o++] = cz + b[2] * hz;
  }
}

/* ---------------------------------- helpers ---------------------------------- */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (v: number) => 1 - (1 - v) ** 3;
const easeInOut = (v: number) => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);

function trendColor(u: number, out: Color) {
  const scaled = clamp01(u) * (TREND_STOPS.length - 1);
  const index = Math.min(TREND_STOPS.length - 2, Math.floor(scaled));
  return out.lerpColors(TREND_STOPS[index], TREND_STOPS[index + 1], scaled - index);
}

function buildTube(points: Vector3[], radius: number, segments: number, withColor: boolean) {
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const geometry = new TubeGeometry(curve, segments, radius, 8, false);
  const position = geometry.getAttribute('position');
  const first = points[0].x;
  const span = points[points.length - 1].x - first;
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i += 1) {
    trendColor((position.getX(i) - first) / span, color);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  if (withColor) geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 0);
  return geometry;
}

/* ----------------------------------- chart ----------------------------------- */

function MarketChart({ lite }: { lite: boolean }) {
  const series = lite ? CANDLES_LITE : CANDLES_FULL;
  const layout = useMemo(() => buildLayout(series), [series]);
  const count = series.length;
  const tubeSegments = lite ? 90 : 160;

  const bodies = useRef<InstancedMesh>(null);
  const wicks = useRef<InstancedMesh>(null);
  const volume = useRef<InstancedMesh>(null);
  const head = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const clock = useRef(0);

  const viewport = useThree((state) => state.viewport);
  const fit = Math.min((viewport.width * 0.92) / (PANEL_W + 0.6), (viewport.height * 0.88) / (PANEL_H + 0.8));

  const geometry = useMemo(() => {
    const outline = new BufferGeometry();
    const positions = new BufferAttribute(new Float32Array(count * FLOATS_PER_BOX), 3);
    positions.setUsage(DynamicDrawUsage);
    outline.setAttribute('position', positions);

    const panel = new BoxGeometry(PANEL_W, PANEL_H, 0.06);
    const panelEdges = new EdgesGeometry(panel);

    const grid: number[] = [];
    for (let k = 0; k <= 4; k += 1) {
      const y = PRICE_BOTTOM + ((PRICE_TOP - PRICE_BOTTOM) * k) / 4;
      grid.push(-PLOT_W / 2 - 0.2, y, PANEL_Z + 0.04, PLOT_W / 2 + 0.2, y, PANEL_Z + 0.04);
    }
    const pitch = PLOT_W / count;
    for (let i = 0; i <= count; i += Math.max(2, Math.round(count / 6))) {
      const x = -PLOT_W / 2 + i * pitch;
      grid.push(x, 0.12, PANEL_Z + 0.04, x, PRICE_TOP + 0.3, PANEL_Z + 0.04);
    }
    const gridGeometry = new BufferGeometry();
    gridGeometry.setAttribute('position', new BufferAttribute(new Float32Array(grid), 3));

    return {
      outline,
      panel,
      panelEdges,
      gridGeometry,
      tube: buildTube(layout.trend, 0.036, tubeSegments, true),
      glow: buildTube(layout.trend, 0.11, tubeSegments, true),
    };
  }, [count, layout, tubeSegments]);

  // give the GPU buffers back when the data set changes (phone <-> desktop width) or the scene unmounts
  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);

  // colours are per instance, so they are written once
  useLayoutEffect(() => {
    layout.slots.forEach((slot, i) => {
      bodies.current?.setColorAt(i, slot.up ? COLOR_UP : COLOR_DOWN);
      volume.current?.setColorAt(i, slot.up ? COLOR_VOLUME_UP : COLOR_VOLUME_DOWN);
    });
    [bodies.current, volume.current].forEach((mesh) => {
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    clock.current = 0; // restart the intro whenever the data set changes
  }, [layout]);

  useFrame((state, delta) => {
    const bodyMesh = bodies.current;
    const wickMesh = wicks.current;
    const volumeMesh = volume.current;
    if (!bodyMesh || !wickMesh || !volumeMesh) return;

    clock.current += Math.min(delta, 0.05);
    const time = clock.current;
    const introEnd = INTRO_DELAY + count * STAGGER + GROW_TIME;
    const outline = geometry.outline.getAttribute('position') as BufferAttribute;
    const last = count - 1;

    // grow the candles in, left to right; afterwards only the newest candle moves
    const from = time <= introEnd + 0.1 ? 0 : last;
    for (let i = from; i < count; i += 1) {
      const slot = layout.slots[i];
      const grow = easeOutCubic(clamp01((time - INTRO_DELAY - i * STAGGER) / GROW_TIME));
      const g = Math.max(grow, 0.0001);

      let bodyY = slot.bodyY;
      let bodyH = slot.bodyH * g;
      let wickY = slot.wickY;
      let wickH = slot.wickH * g;
      if (i === last && grow >= 1) {
        // the newest candle "trades": its close drifts up and down a little
        const drift = Math.sin(time * 1.6) * 0.07 + Math.sin(time * 0.7) * 0.04;
        const top = slot.bodyY + slot.bodyH / 2 + drift;
        const bottom = slot.bodyY - slot.bodyH / 2;
        bodyH = Math.max(top - bottom, MIN_BODY);
        bodyY = (top + bottom) / 2;
        const wickTop = Math.max(slot.wickY + slot.wickH / 2, top + 0.04);
        const wickBottom = slot.wickY - slot.wickH / 2;
        wickH = wickTop - wickBottom;
        wickY = (wickTop + wickBottom) / 2;
      }

      const width = layout.bodyW * (0.45 + 0.55 * g);
      dummy.position.set(slot.x, bodyY, 0);
      dummy.scale.set(width, bodyH, BODY_DEPTH);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      writeBoxEdges(outline.array as Float32Array, i, slot.x, bodyY, 0, width, bodyH, BODY_DEPTH);

      dummy.position.set(slot.x, wickY, 0);
      dummy.scale.set(WICK_WIDTH, Math.max(wickH, 0.0001), WICK_WIDTH);
      dummy.updateMatrix();
      wickMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(slot.x, VOLUME_BASE + (slot.volH * g) / 2, VOLUME_Z);
      dummy.scale.set(layout.bodyW, Math.max(slot.volH * g, 0.0001), BODY_DEPTH * 0.4);
      dummy.updateMatrix();
      volumeMesh.setMatrixAt(i, dummy.matrix);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    wickMesh.instanceMatrix.needsUpdate = true;
    volumeMesh.instanceMatrix.needsUpdate = true;
    outline.needsUpdate = true;

    // the trend line draws itself, then a marker pulses at its tip
    const reveal = easeInOut(clamp01((time - TREND_START) / TREND_TIME));
    const indexCount = Math.floor(reveal * tubeSegments) * 8 * 6;
    geometry.tube.setDrawRange(0, indexCount);
    geometry.glow.setDrawRange(0, indexCount);

    const tip = layout.trend[last];
    if (head.current && ring.current) {
      const shown = reveal >= 1 ? 1 : 0;
      const pulse = (state.clock.elapsedTime * 0.9) % 1;
      head.current.visible = shown === 1;
      ring.current.visible = shown === 1;
      head.current.position.set(tip.x, tip.y, tip.z);
      ring.current.position.set(tip.x, tip.y, tip.z);
      ring.current.scale.setScalar(1 + pulse * 2.2);
      (ring.current.material as { opacity: number }).opacity = 0.5 * (1 - pulse);
    }
  });

  return (
    <group scale={fit}>
      <group position={[0, -PANEL_H / 2, 0]}>
        {/* glass panel with its price grid */}
        <mesh geometry={geometry.panel} position={[0, PANEL_H / 2, PANEL_Z]}>
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.08}
            roughness={0.06}
            clearcoat={1}
            clearcoatRoughness={0.05}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={geometry.panelEdges} position={[0, PANEL_H / 2, PANEL_Z]}>
          <lineBasicMaterial color={PALETTE.slate} transparent opacity={0.22} />
        </lineSegments>
        <lineSegments geometry={geometry.gridGeometry}>
          <lineBasicMaterial color={PALETTE.slate} transparent opacity={0.16} />
        </lineSegments>

        {/* volume bars, wicks and candle bodies: one instanced mesh each */}
        <instancedMesh ref={volume} args={[undefined, undefined, count]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial transparent opacity={0.42} roughness={0.4} metalness={0.1} />
        </instancedMesh>
        <instancedMesh ref={wicks} args={[undefined, undefined, count]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={PALETTE.navySoft} metalness={0.85} roughness={0.28} />
        </instancedMesh>
        <instancedMesh ref={bodies} args={[undefined, undefined, count]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.82}
            roughness={0.12}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.06}
          />
        </instancedMesh>
        <lineSegments geometry={geometry.outline} frustumCulled={false}>
          <lineBasicMaterial color="#17325A" transparent opacity={0.55} />
        </lineSegments>

        {/* the trend line: soft halo behind, brushed-steel tube in front */}
        <mesh geometry={geometry.glow} frustumCulled={false}>
          <meshBasicMaterial vertexColors transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <mesh geometry={geometry.tube} frustumCulled={false}>
          <meshStandardMaterial
            vertexColors
            metalness={0.45}
            roughness={0.25}
            emissive={PALETTE.teal}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh ref={head} visible={false}>
          <sphereGeometry args={[0.1, 24, 16]} />
          <meshStandardMaterial color={PALETTE.emerald} emissive={PALETTE.emerald} emissiveIntensity={0.6} roughness={0.25} />
        </mesh>
        <mesh ref={ring} visible={false}>
          <ringGeometry args={[0.12, 0.15, 40]} />
          <meshBasicMaterial color={PALETTE.emerald} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function MarketTrendScene(props: SceneProps) {
  return (
    <SceneCanvas {...props} camera={CAMERA}>
      <StudioLights lite={props.lite} />
      <ParallaxRig base={BASE_ROTATION}>
        <MarketChart lite={props.lite} />
      </ParallaxRig>
    </SceneCanvas>
  );
}
