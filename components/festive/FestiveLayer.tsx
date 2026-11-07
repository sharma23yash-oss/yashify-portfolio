'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Last day of the Diwali effects, inclusive, in India time. After this date the effects code is
 * never even downloaded, so nothing needs removing by hand. Override per deploy with the
 * NEXT_PUBLIC_FESTIVE_END_DATE env var (format YYYY-MM-DD).
 */
export const FESTIVE_END_DATE = process.env.NEXT_PUBLIC_FESTIVE_END_DATE || '2026-11-15';

function isFestiveSeason() {
  const end = new Date(`${FESTIVE_END_DATE}T23:59:59+05:30`);
  // A malformed date counts as expired, so a typo can never leave the effects on forever.
  return !Number.isNaN(end.getTime()) && Date.now() <= end.getTime();
}

const Nothing = () => null;

// Client-only, so it never touches server HTML, layout or LCP.
// The date is checked in the browser, not at build time, so a cached build still switches off.
const DiwaliEffects = dynamic(
  () => (isFestiveSeason() ? import('./DiwaliEffects') : Promise.resolve(Nothing)),
  { ssr: false, loading: Nothing },
);

export default function FestiveLayer() {
  const [ready, setReady] = useState(false);

  // Wait until the page has fully loaded and the browser is idle before fetching or running any
  // of the effects, so they stay out of the load window (blocking time, interactivity).
  useEffect(() => {
    let idleId = 0;
    let timerId = 0;
    const start = () => {
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      else timerId = window.setTimeout(() => setReady(true), 1500);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idleId) window.cancelIdleCallback(idleId);
      window.clearTimeout(timerId);
    };
  }, []);

  return ready ? <DiwaliEffects /> : null;
}
