'use client';

/**
 * SceneFrame decides WHETHER and WHEN a 3D scene runs, and what to show instead.
 * It contains no three.js code, so it is cheap to keep in the main bundle; the heavy
 * scene is only requested (through next/dynamic) once every check below passes.
 *
 *   static picture instead of 3D when:
 *     - the visitor asked for reduced motion (prefers-reduced-motion)      [live updates]
 *     - the browser is in data-saver mode, or on a 2G connection
 *     - WebGL 2 is missing, or only available as slow software rendering
 *     - the 3D code fails to load, throws, or the GPU context is lost
 *   nothing at all when the screen is narrower than `minWidth`
 *   3D starts only after the page has loaded and the browser is idle, and the section
 *   is near the viewport. It pauses while off screen or while the tab is hidden.
 *
 * The frame is `absolute`, `pointer-events-none` and `aria-hidden`: it never affects
 * layout, clicks, scrolling or screen readers.
 */

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';

export type SceneProps = {
  /** false pauses the render loop (the scene is off screen or the tab is hidden) */
  active: boolean;
  /** lighter settings for phones and low-end devices */
  lite: boolean;
  /** called once, after the first frames have been drawn */
  onReady: () => void;
  /** called if WebGL breaks (context lost); the frame then shows the static picture */
  onFail: () => void;
};

type Mode = 'pending' | 'off' | 'static' | 'live';

type ConnectionInfo = EventTarget & { saveData?: boolean; effectiveType?: string };
type NavigatorExtras = Navigator & { connection?: ConnectionInfo; deviceMemory?: number };

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const LITE_QUERY = '(max-width: 767px)';
const LOAD_PATIENCE_MS = 3000; // do not wait forever for a slow third-party image to finish loading
const NEAR_MARGIN = '900px 0px'; // start loading this far before the section scrolls into view
const VIEW_MARGIN = '60px 0px'; // render while within this distance of the viewport
const FADE_MS = 900;

/* ------------------------------ capability checks ------------------------------ */

let webglProbe: boolean | undefined;

/** True when the browser can create a hardware-accelerated WebGL 2 context (what three.js needs). Checked once. */
function webglAvailable(): boolean {
  if (webglProbe === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      webglProbe = gl !== null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext(); // hand the context straight back
    } catch {
      webglProbe = false;
    }
  }
  return webglProbe;
}

const serverMode = (): Mode => 'pending';
const serverFalse = () => false;
const serverTrue = () => true;

function useSceneMode(minWidth: number): Mode {
  const store = useMemo(() => {
    const wide = `(min-width: ${minWidth}px)`;
    return {
      subscribe(onChange: () => void) {
        const queries = [window.matchMedia(REDUCED_MOTION), window.matchMedia(wide)];
        queries.forEach((query) => query.addEventListener('change', onChange));
        const connection = (navigator as NavigatorExtras).connection;
        connection?.addEventListener('change', onChange);
        return () => {
          queries.forEach((query) => query.removeEventListener('change', onChange));
          connection?.removeEventListener('change', onChange);
        };
      },
      getSnapshot(): Mode {
        if (!window.matchMedia(wide).matches) return 'off';
        if (window.matchMedia(REDUCED_MOTION).matches) return 'static';
        const connection = (navigator as NavigatorExtras).connection;
        if (connection?.saveData || /2g$/.test(connection?.effectiveType ?? '')) return 'static';
        return webglAvailable() ? 'live' : 'static';
      },
    };
  }, [minWidth]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, serverMode);
}

function subscribeLite(onChange: () => void) {
  const query = window.matchMedia(LITE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getLite(): boolean {
  const nav = navigator as NavigatorExtras;
  return (
    window.matchMedia(LITE_QUERY).matches ||
    (nav.deviceMemory ?? 8) <= 2 ||
    (navigator.hardwareConcurrency ?? 8) <= 2
  );
}

function subscribeTabVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

const getTabVisible = () => document.visibilityState === 'visible';

/** True once the page has loaded (or a few seconds have passed) and the browser is idle. */
function useIdleReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle: number | undefined;
    let timer: number | undefined;
    let patience: number | undefined;
    const start = () => {
      window.removeEventListener('load', start);
      window.clearTimeout(patience);
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      } else {
        timer = window.setTimeout(() => setReady(true), 300); // Safari has no requestIdleCallback
      }
    };
    if (document.readyState === 'complete') start();
    else {
      window.addEventListener('load', start);
      patience = window.setTimeout(start, LOAD_PATIENCE_MS);
    }
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(patience);
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, []);
  return ready;
}

/** `near` turns true once the element has come within NEAR_MARGIN of the viewport (and stays true). */
function useViewportWatch(ref: { current: HTMLElement | null }, enabled: boolean) {
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return undefined;
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: NEAR_MARGIN },
    );
    const viewObserver = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: VIEW_MARGIN,
    });
    nearObserver.observe(element);
    viewObserver.observe(element);
    return () => {
      nearObserver.disconnect();
      viewObserver.disconnect();
    };
  }, [ref, enabled]);
  return { near, inView };
}

/* ------------------------------- small building blocks ------------------------------ */

function Fade({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className="h-full w-full"
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
    >
      {children}
    </div>
  );
}

/** Catches a scene that throws or whose code fails to load, and tells the frame. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[3D scene] showing the static picture instead:', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* --------------------------------------- frame -------------------------------------- */

type SceneFrameProps = {
  /** the lazily loaded scene: dynamic(() => import('./SomeScene'), { ssr: false }) */
  Scene: ComponentType<SceneProps>;
  /** shown instead of the 3D scene (reduced motion, no WebGL, data saver, errors) */
  poster: ReactNode;
  /** tailwind classes that place and size the frame inside a `relative isolate` parent */
  className?: string;
  style?: CSSProperties;
  /** render nothing below this viewport width, in px (0 = always) */
  minWidth?: number;
};

export default function SceneFrame({ Scene, poster, className = 'inset-0', style, minWidth = 0 }: SceneFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useSceneMode(minWidth);
  const lite = useSyncExternalStore(subscribeLite, getLite, serverFalse);
  const tabVisible = useSyncExternalStore(subscribeTabVisibility, getTabVisible, serverTrue);
  const idle = useIdleReady();
  const { near, inView } = useViewportWatch(ref, mode === 'live');

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const showPoster = mode === 'static' || (mode === 'live' && failed);
  const loadScene = mode === 'live' && !failed && idle && near;
  const active = inView && tabVisible;

  // when the scene is taken away (reduced motion switched on, screen narrowed), its next mount starts hidden again
  const [wasLoading, setWasLoading] = useState(false);
  if (wasLoading !== loadScene) {
    setWasLoading(loadScene);
    if (!loadScene) setReady(false);
  }

  let state: string = mode;
  if (mode === 'live') state = failed ? 'static' : !loadScene ? 'waiting' : !ready ? 'loading' : active ? 'running' : 'paused';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-scene={state}
      className={`pointer-events-none absolute -z-10 overflow-hidden ${className}`}
      style={style}
    >
      {showPoster && <Fade visible={mounted}>{poster}</Fade>}
      {loadScene && (
        <Fade visible={ready}>
          <SceneBoundary onError={() => setFailed(true)}>
            <Scene active={active} lite={lite} onReady={() => setReady(true)} onFail={() => setFailed(true)} />
          </SceneBoundary>
        </Fade>
      )}
    </div>
  );
}
