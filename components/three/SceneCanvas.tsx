'use client';

/**
 * The shared WebGL canvas for both 3D scenes. This file (and the scene files that import
 * it) is only ever loaded on demand by SceneFrame, never in the main bundle.
 *
 *  - transparent background, no pointer events: it can sit behind any UI
 *  - the render loop is paused when `active` is false (off screen or tab hidden)
 *  - pixel ratio is capped, and drops to 1 if the device cannot hold its frame rate
 *  - no shadows, no post-processing, no texture downloads (the lighting is built locally)
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { NeutralToneMapping, type Group } from 'three';
import type { SceneProps } from './SceneFrame';

type CameraSetup = { position: [number, number, number]; fov: number };

const MAX_DPR = 1.5; // retina screens render at 1.5x at most; background art does not need more
const SMOOTHING = 3.2; // higher = the parallax follows the pointer faster

/* ------------------------------- pointer parallax ------------------------------ */

type PointerState = { x: number; y: number; scroll: number };

/**
 * Tracks the pointer on the whole window (the canvas itself never receives events).
 * x and y are -1..1 across the viewport. `scroll` is -1..1 for where the canvas sits
 * vertically on screen, which gives touch screens (no hover) a gentle tilt as they scroll.
 */
function useViewportPointer(element: HTMLElement) {
  const state = useRef<PointerState>({ x: 0, y: 0, scroll: 0 });

  useEffect(() => {
    const target = state.current;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    const onScroll = () => {
      const rect = element.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      target.scroll = Math.max(-1, Math.min(1, offset));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    onScroll();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [element]);

  return state;
}

type RigProps = {
  children: ReactNode;
  /** resting rotation in radians: [x, y, z] */
  base?: [number, number, number];
  /** how far the scene tilts and turns with the pointer (1 = default) */
  strength?: number;
  /** vertical offset that centres the content on the origin */
  offsetY?: number;
};

/** Turns and tilts its children with the pointer, smoothed, plus a very slow idle drift. */
export function ParallaxRig({ children, base = [0, 0, 0], strength = 1, offsetY = 0 }: RigProps) {
  const group = useRef<Group>(null);
  const element = useThree((state) => state.gl.domElement);
  const pointer = useViewportPointer(element);
  const eased = useRef<PointerState>({ x: 0, y: 0, scroll: 0 });

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    const follow = 1 - Math.exp(-Math.min(delta, 0.05) * SMOOTHING); // same feel at any frame rate
    const goal = pointer.current;
    const now = eased.current;
    now.x += (goal.x - now.x) * follow;
    now.y += (goal.y - now.y) * follow;
    now.scroll += (goal.scroll - now.scroll) * follow;

    const t = state.clock.elapsedTime;
    node.rotation.y = base[1] + now.x * 0.3 * strength + Math.sin(t * 0.35) * 0.02;
    node.rotation.x = base[0] + (now.y * 0.12 + now.scroll * 0.1) * strength + Math.sin(t * 0.27) * 0.012;
    node.rotation.z = base[2];
    node.position.y = offsetY + Math.sin(t * 0.55) * 0.04;
  });

  return <group ref={group}>{children}</group>;
}

/* ---------------------------------- lighting ---------------------------------- */

/**
 * A small studio: soft boxes for the glass and metal to reflect. The reflections are
 * drawn locally once (frames={1}), so nothing is downloaded.
 */
export function StudioLights({ lite }: { lite: boolean }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 7, 6]} intensity={1.7} />
      <directionalLight position={[-6, 2, 3]} intensity={0.7} color="#5EEAD4" />
      <Environment resolution={lite ? 64 : 128} frames={1} environmentIntensity={0.9}>
        <color attach="background" args={['#9DB2C8']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 6, 5]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-7, 1, 3]} rotation-y={Math.PI / 2} scale={[7, 3, 1]} color="#5EEAD4" />
        <Lightformer form="rect" intensity={1.6} position={[7, 2, 2]} rotation-y={-Math.PI / 2} scale={[7, 3, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={1.4} position={[0, -2, 6]} scale={5} color="#C7D7FE" />
      </Environment>
    </>
  );
}

/* ----------------------------------- canvas ----------------------------------- */

/** Tells the frame once real pixels have been drawn, so it can fade the scene in. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 3) return;
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

type SceneCanvasProps = SceneProps & { camera: CameraSetup; children: ReactNode };

export default function SceneCanvas({ active, lite, camera, onReady, onFail, children }: SceneCanvasProps) {
  const [maxDpr, setMaxDpr] = useState(lite ? 1 : MAX_DPR);
  // draw the first frames even if the scene is still off screen, so shaders are compiled
  // before the visitor scrolls to it (no hitch), then follow `active`
  const [warm, setWarm] = useState(true);
  // Tearing the canvas down makes the browser fire "context lost" too. Only a loss that
  // happens while the scene is mounted is a real failure.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <Canvas
      frameloop={active || warm ? 'always' : 'never'}
      dpr={[1, maxDpr]}
      camera={{ position: camera.position, fov: camera.fov, near: 0.1, far: 80 }}
      gl={{
        alpha: true,
        antialias: !lite,
        stencil: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true, // software rendering would be slow: use the poster instead
      }}
      style={{ pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping; // keeps the brand colours true
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            if (mounted.current) onFail();
          },
          { once: true },
        );
      }}
    >
      <PerformanceMonitor onDecline={() => setMaxDpr(1)} />
      <ReadySignal
        onReady={() => {
          setWarm(false);
          onReady();
        }}
      />
      {children}
    </Canvas>
  );
}
