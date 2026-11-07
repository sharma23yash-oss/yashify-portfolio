'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { EASE, FOCUS, cn } from '@/components/ui/tokens';
import { WHATSAPP_URL } from '@/lib/site';

/* ============================ TWEAK HERE ============================
 * Colours are picked to show up on the light #FAFAFA page: deep amber, orange and magenta
 * rather than pale gold, which would vanish on near-white.
 * ===================================================================*/
const COLORS = {
  burst: ['#F59E0B', '#EA580C', '#DB2777', '#C026D3', '#D97706', '#E11D48'],
  clickSpark: ['#F59E0B', '#EA580C', '#DB2777'],
  rocketTrail: '#F59E0B',
  lanterns: ['#F59E0B', '#EA580C', '#DB2777', '#FBBF24'],
  flameOuter: '#F97316',
  flameInner: '#FCD34D',
  flameCore: '#FFFBEB',
  diyaBody: '#B45309',
  diyaRim: '#7C2D12',
  diyaDots: '#FCD34D',
  diyaGlow: 'rgba(251,146,60,0.45)',
  bannerBg: '#0B1F3A', // the site's navy
  bannerText: '#FFFFFF',
  bannerAccent: '#FBBF24',
} as const;

const TUNING = {
  burstEveryMs: [2000, 4000] as const,
  maxBursts: 6, // fireworks in the air at once (rising + exploding)
  maxClickSparks: 8,
  particlesPerBurst: { desktop: 44, mobile: 24 },
  particlesPerClick: { desktop: 16, mobile: 10 },
  lanterns: { desktop: 14, mobile: 6 },
  diyas: { desktop: 6, mobile: 4 },
  maxAlpha: 0.85,
};

const STORAGE_FESTIVE = 'yashify:festive-mode'; // 'on' | 'off'
const STORAGE_BANNER = 'yashify:diwali-banner-dismissed'; // '1' once closed
const MOBILE_QUERY = '(max-width: 767px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** Click sparks skip anything the visitor is trying to use. */
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, video, iframe, [role="button"], [role="link"], [role="tab"], [contenteditable="true"]';

/* ---------------------------- small stores ---------------------------- */

/** localStorage with an in-memory fallback (private mode or blocked storage must not break the page). */
const memoryPrefs = new Map<string, string>();
const prefListeners = new Set<() => void>();

function readPref(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* storage blocked: fall back to memory */
  }
  return memoryPrefs.get(key) ?? null;
}

function writePref(key: string, value: string) {
  memoryPrefs.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: memory still holds it for this visit */
  }
  prefListeners.forEach((fn) => fn());
}

function subscribePrefs(onChange: () => void) {
  prefListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    prefListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

const usePref = (key: string) => useSyncExternalStore(subscribePrefs, () => readPref(key), () => null);

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const useTabVisible = () =>
  useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== 'hidden', () => true);

/** The sticky/fixed site nav, if this page has one (a plain article <header> does not count). */
function findNav(): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('header'))) {
    const position = getComputedStyle(el).position;
    if (position === 'sticky' || position === 'fixed') return el;
  }
  return null;
}

/** Height of the nav band at the top of the screen, so effects can stay below it. */
function useNavHeight() {
  const pathname = usePathname();
  const subscribe = useCallback(
    (onChange: () => void) => {
      const nav = findNav();
      const ro = nav ? new ResizeObserver(onChange) : null;
      if (nav && ro) ro.observe(nav);
      window.addEventListener('resize', onChange);
      return () => {
        ro?.disconnect();
        window.removeEventListener('resize', onChange);
      };
    },
    // re-find the nav after a client-side route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname],
  );
  return useSyncExternalStore(subscribe, () => findNav()?.offsetHeight ?? 0, () => 0);
}

/** Stable pseudo-random numbers, so render stays pure and positions don't jump on re-render. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ---------------------------- fireworks engine ---------------------------- */

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number };
type Burst = { kind: 'firework' | 'spark'; particles: Particle[] };
type Rocket = { x: number; startY: number; targetY: number; t: number };

const ROCKET_FRAMES = 55;
const DRAG = 0.965;
const GRAVITY = 0.045;

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

function createFireworks(canvas: HTMLCanvasElement, mobile: boolean, getTop: () => number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { spark() {}, destroy() {} };

  let w = 0;
  let h = 0;
  let raf = 0;
  let timer = 0;
  let last = 0;
  let destroyed = false;
  const rockets: Rocket[] = [];
  const bursts: Burst[] = [];

  const resize = () => {
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    // Phones fire resize while scrolling as the address bar shows and hides. Resizing a canvas
    // reallocates and clears it, so only do it when the width changes or the height grows; a
    // slightly taller canvas just runs off the bottom of the screen.
    const widthChanged = nextW !== w;
    if (!widthChanged && nextH <= h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = nextW;
    h = widthChanged ? nextH : Math.max(nextH, h);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const explode = (kind: Burst['kind'], x: number, y: number) => {
    const firework = kind === 'firework';
    const count = firework
      ? mobile ? TUNING.particlesPerBurst.mobile : TUNING.particlesPerBurst.desktop
      : mobile ? TUNING.particlesPerClick.mobile : TUNING.particlesPerClick.desktop;
    const speed = firework ? 3.1 : 2.2;
    const colors = firework ? COLORS.burst : COLORS.clickSpark;
    const base = pick(colors); // most of a burst shares one colour, with a few accents
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const s = speed * (0.5 + Math.random() * 0.5);
      const maxLife = firework ? 50 + Math.random() * 25 : 26 + Math.random() * 12;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: maxLife,
        maxLife,
        color: Math.random() < 0.7 ? base : pick(colors),
        size: firework ? 1.6 + Math.random() * 0.8 : 1.4 + Math.random() * 0.6,
      });
    }
    bursts.push({ kind, particles });
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t = Math.min(r.t + dt / ROCKET_FRAMES, 1);
      const eased = 1 - (1 - r.t) ** 3;
      const y = r.startY + (r.targetY - r.startY) * eased;
      ctx.globalAlpha = 0.55 * (1 - r.t * 0.5);
      ctx.strokeStyle = COLORS.rocketTrail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.x, y + 16 * (1 - eased) + 4);
      ctx.lineTo(r.x, y);
      ctx.stroke();
      if (r.t >= 1) {
        rockets.splice(i, 1);
        explode('firework', r.x, r.targetY);
      }
    }

    for (let b = bursts.length - 1; b >= 0; b--) {
      let alive = 0;
      for (const p of bursts[b].particles) {
        if (p.life <= 0) continue;
        const drag = DRAG ** dt;
        p.vx *= drag;
        p.vy = p.vy * drag + GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) continue;
        alive++;
        ctx.globalAlpha = (p.life / p.maxLife) ** 1.3 * TUNING.maxAlpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      if (!alive) bursts.splice(b, 1);
    }
    ctx.globalAlpha = 1;

    // Idle when nothing is in the air: no frames are drawn between bursts.
    if (rockets.length || bursts.length) raf = requestAnimationFrame(frame);
  };

  const run = () => {
    if (raf || destroyed) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const launch = () => {
    const inAir = rockets.length + bursts.filter((b) => b.kind === 'firework').length;
    if (inAir >= TUNING.maxBursts) return;
    const top = getTop() + 48;
    const bottom = Math.max(top + 40, h * 0.5);
    rockets.push({
      x: w * (0.1 + Math.random() * 0.8),
      startY: h + 8,
      targetY: top + Math.random() * (bottom - top),
      t: 0,
    });
    run();
  };

  const schedule = (delay: number) => {
    timer = window.setTimeout(() => {
      launch();
      const [min, max] = TUNING.burstEveryMs;
      schedule(min + Math.random() * (max - min));
    }, delay);
  };

  resize();
  window.addEventListener('resize', resize);
  schedule(800);

  return {
    spark(x: number, y: number) {
      if (bursts.filter((b) => b.kind === 'spark').length >= TUNING.maxClickSparks) return;
      explode('spark', x, y);
      run();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    },
  };
}

/* ---------------------------- pieces ---------------------------- */

const STYLES = `
.dw-paused, .dw-paused * { animation-play-state: paused !important; }
@keyframes dw-rise { 0% { transform: translate3d(0,0,0); opacity: 0 } 12% { opacity: 1 } 80% { opacity: .9 } 100% { transform: translate3d(0,-115vh,0); opacity: 0 } }
.dw-rise { position: absolute; bottom: -40px; animation: dw-rise linear infinite; will-change: transform, opacity; }
/* Fixed sway widths: keyframes that read a CSS variable can't run on the GPU, so they'd cost a
   main-thread frame every 16ms. */
@keyframes dw-sway-0 { from { transform: translateX(-10px) } to { transform: translateX(10px) } }
@keyframes dw-sway-1 { from { transform: translateX(-18px) } to { transform: translateX(18px) } }
@keyframes dw-sway-2 { from { transform: translateX(-28px) } to { transform: translateX(28px) } }
.dw-sway { display: block; animation: dw-sway-0 3.8s ease-in-out infinite alternate; will-change: transform; }
.dw-lantern { display: block; width: 9px; height: 13px; border-radius: 45% 45% 30% 30%; opacity: .5; box-shadow: 0 0 10px 2px currentColor; }
.dw-mote { display: block; width: 4px; height: 4px; border-radius: 999px; opacity: .55; box-shadow: 0 0 8px 2px currentColor; }
@keyframes dw-flicker {
  0%, 100% { transform: scale(1, 1) skewX(0deg); opacity: 1 }
  20% { transform: scale(.93, 1.07) skewX(2.5deg) }
  45% { transform: scale(1.05, .94) skewX(-2deg); opacity: .9 }
  70% { transform: scale(.96, 1.04) skewX(1.5deg) }
}
/* The flame is its own <svg> box (not a <g> inside one), so the flicker runs on the GPU. 50% 60% is the flame's base. */
.dw-flame { transform-origin: 50% 60%; animation: dw-flicker 1.3s ease-in-out infinite; will-change: transform; }
@keyframes dw-glow { 0%, 100% { opacity: .7; transform: scale(1) } 50% { opacity: 1; transform: scale(1.12) } }
.dw-glow { animation: dw-glow 2.4s ease-in-out infinite; }
`;

function DiyaIcon({ animated, delay = 0, className }: { animated: boolean; delay?: number; className?: string }) {
  const flameStyle: CSSProperties | undefined = animated ? { animationDelay: `${delay}s` } : undefined;
  // Two stacked SVGs sharing one viewBox: the flame on top of the bowl, drawn as before.
  return (
    <span className={cn('relative block', className)} aria-hidden="true">
      <svg viewBox="0 0 48 40" className="absolute inset-0 h-full w-full" focusable="false">
        <path d="M5 24h38c-1 8.6-8.6 13.5-19 13.5S6 32.6 5 24Z" fill={COLORS.diyaBody} />
        <ellipse cx="24" cy="24" rx="19" ry="3" fill={COLORS.diyaRim} />
        <circle cx="15" cy="30" r="1.2" fill={COLORS.diyaDots} />
        <circle cx="24" cy="32" r="1.2" fill={COLORS.diyaDots} />
        <circle cx="33" cy="30" r="1.2" fill={COLORS.diyaDots} />
      </svg>
      <svg
        viewBox="0 0 48 40"
        className={cn('absolute inset-0 h-full w-full', animated && 'dw-flame')}
        style={flameStyle}
        focusable="false"
      >
        <path d="M24 3c3.2 6 5.4 10.2 5.4 14.2 0 3.9-2.4 6.8-5.4 6.8s-5.4-2.9-5.4-6.8C18.6 13.2 20.8 9 24 3Z" fill={COLORS.flameOuter} />
        <path d="M24 10c1.8 3.4 3 5.8 3 8 0 2.3-1.3 4-3 4s-3-1.7-3-4c0-2.2 1.2-4.6 3-8Z" fill={COLORS.flameInner} />
        <ellipse cx="24" cy="20" rx="1.2" ry="1.8" fill={COLORS.flameCore} />
      </svg>
    </span>
  );
}

function Diyas({ count }: { count: number }) {
  return (
    // Sits in the gap between the festive toggle (bottom-left) and the page's "Email me" button
    // (bottom-right, ~128px wide), so it never covers either. Update the insets if those change.
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[max(0.25rem,env(safe-area-inset-bottom))] left-[68px] right-[156px] z-[2] flex justify-center sm:left-[196px] sm:right-[168px]"
    >
      <div className="flex w-full max-w-[520px] justify-between">
        {Array.from({ length: count }, (_, i) => (
          <Diya key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

function Diya({ index: i }: { index: number }) {
  return (
    <div className="relative h-7 w-8 sm:h-9 sm:w-11">
      <span
        className="dw-glow absolute -inset-3 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${COLORS.diyaGlow}, transparent 70%)`,
          animationDelay: `${i * 0.37}s`,
        }}
      />
      <DiyaIcon animated delay={i * 0.23} className="relative h-full w-full" />
    </div>
  );
}

function Lanterns({ count }: { count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: 3 + seeded(i, 1) * 94,
        duration: 18 + seeded(i, 2) * 14,
        delay: -seeded(i, 3) * 30, // negative: already mid-flight on load
        sway: `dw-sway-${Math.floor(seeded(i, 4) * 3)}`,
        lantern: i % 3 === 0,
        color: COLORS.lanterns[i % COLORS.lanterns.length],
      })),
    [count],
  );
  return (
    <>
      {items.map((item, i) => (
        <span
          key={i}
          className="dw-rise"
          style={{ left: `${item.left}%`, animationDuration: `${item.duration}s`, animationDelay: `${item.delay}s` }}
        >
          <span className="dw-sway" style={{ animationName: item.sway }}>
            <span
              className={item.lantern ? 'dw-lantern' : 'dw-mote'}
              style={{ color: item.color, backgroundColor: item.color }}
            />
          </span>
        </span>
      ))}
    </>
  );
}

function Banner({ top, reduce, paused, onClose }: { top: number; reduce: boolean; paused: boolean; onClose: () => void }) {
  return (
    <div
      className={cn('pointer-events-none fixed inset-x-0 z-[3] flex justify-center px-4', paused && 'dw-paused')}
      style={{ top: top + 8 }}
    >
      <motion.div
        role="status"
        initial={reduce ? false : { opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -12 }}
        transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : 0.4 }}
        className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full py-1.5 pl-3 pr-1.5 text-sm font-medium shadow-[0_14px_36px_-14px_rgba(11,31,58,0.55)]"
        style={{ backgroundColor: COLORS.bannerBg, color: COLORS.bannerText }}
      >
        <DiyaIcon animated={!reduce} className="h-5 w-6 shrink-0" />
        <span className="truncate">Happy Diwali from Yash Sharma ✨</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss Diwali greeting"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-4 w-4" style={{ color: COLORS.bannerAccent }} />
        </button>
      </motion.div>
    </div>
  );
}

/* ---------------------------- main ---------------------------- */

export default function DiwaliEffects() {
  const reduce = useMediaQuery(REDUCED_MOTION_QUERY);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const visible = useTabVisible();
  const navHeight = useNavHeight();
  const enabled = usePref(STORAGE_FESTIVE) !== 'off';
  const bannerDismissed = usePref(STORAGE_BANNER) === '1';

  const animate = enabled && !reduce;
  const running = animate && visible;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createFireworks> | null>(null);
  const navHeightRef = useRef(navHeight);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    navHeightRef.current = navHeight;
  }, [navHeight]);

  // Fireworks run only while the tab is visible; hiding the tab tears the loop and timer down.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!running || !canvas) return;
    const engine = createFireworks(canvas, mobile, () => navHeightRef.current);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [running, mobile]);

  // Tap/click on empty space: a small spark burst.
  useEffect(() => {
    if (!running) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(INTERACTIVE)) return;
      engineRef.current?.spark(e.clientX, e.clientY);
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [running]);

  // Fade the effects out over the nav so they always read as sitting beneath it.
  const belowNav: CSSProperties = {
    maskImage: `linear-gradient(to bottom, transparent ${navHeight}px, #000 ${navHeight + 56}px)`,
    WebkitMaskImage: `linear-gradient(to bottom, transparent ${navHeight}px, #000 ${navHeight + 56}px)`,
  };

  const showBanner = !bannerDismissed && (enabled || reduce);

  return (
    <>
      {animate && (
        <div className={cn(!visible && 'dw-paused')}>
          <style dangerouslySetInnerHTML={{ __html: STYLES }} />
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" style={belowNav}>
            <Lanterns count={mobile ? TUNING.lanterns.mobile : TUNING.lanterns.desktop} />
            <canvas ref={canvasRef} className="absolute left-0 top-0" />
          </div>
          <Diyas count={mobile ? TUNING.diyas.mobile : TUNING.diyas.desktop} />
        </div>
      )}

      <AnimatePresence>
        {showBanner && (
          <Banner
            key="diwali-banner"
            top={navHeight}
            reduce={reduce}
            paused={!visible}
            onClose={() => {
              // The close button is about to disappear; keep keyboard focus on the page, not <body>.
              toggleRef.current?.focus({ preventScroll: true });
              writePref(STORAGE_BANNER, '1');
            }}
          />
        )}
      </AnimatePresence>

      {/* Reduced motion: only the static banner, so no toggle either. Bottom-left keeps it clear of the contact button. */}
      {!reduce && (
        <button
          ref={toggleRef}
          type="button"
          onClick={() => writePref(STORAGE_FESTIVE, enabled ? 'off' : 'on')}
          aria-pressed={enabled}
          // A fixed name; aria-pressed carries on/off (a name that changes too would announce the state twice).
          aria-label="Festive mode"
          title={`Festive mode ${enabled ? 'on' : 'off'}`}
          className={cn(
            'fixed left-4 z-[3] inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_24px_-12px_rgba(15,23,42,0.35)] transition-colors sm:left-6 sm:px-3.5',
            // The WhatsApp button (components/site/WhatsAppButton.tsx) owns the bottom-left corner when set; sit above it.
            WHATSAPP_URL
              ? 'bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.5rem)] sm:bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4rem)]'
              : 'bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]',
            enabled
              ? 'border-[#0B1F3A] bg-[#0B1F3A] text-white hover:bg-[#14305A]'
              : 'border-slate-300 bg-white/90 text-slate-700 hover:border-slate-400',
            FOCUS,
          )}
        >
          <Sparkles className="h-4 w-4" style={enabled ? { color: COLORS.bannerAccent } : undefined} aria-hidden="true" />
          <span className="hidden sm:inline">Festive mode {enabled ? 'on' : 'off'}</span>
        </button>
      )}
    </>
  );
}
