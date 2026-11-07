'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Cloudflare Turnstile ("I'm human" check), rendered explicitly so React controls it.
 * The script is loaded once, only on pages that show this component. The CSP in next.config.ts
 * allows challenges.cloudflare.com for exactly this.
 */

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')),
    );
    script.addEventListener('error', () => {
      loading = null;
      script.remove();
      reject(new Error('Turnstile failed to load'));
    });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void };

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  /** Called when the token expires or the check errors, so the form clears its copy. */
  onClear: () => void;
  /** Called if the script can't load (blocked by an extension, or offline). */
  onLoadError?: () => void;
};

export const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile(
  { siteKey, onToken, onClear, onLoadError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);
  // Always call the latest callbacks without re-creating the widget on every render.
  const callbacks = useRef({ onToken, onClear, onLoadError });
  useEffect(() => {
    callbacks.current = { onToken, onClear, onLoadError };
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        widgetRef.current = api.render(hostRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => callbacks.current.onToken(token),
          'expired-callback': () => callbacks.current.onClear(),
          'error-callback': () => callbacks.current.onClear(),
        });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onLoadError?.();
      });
    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey]);

  // Reserves the widget's height so nothing jumps when it appears.
  return <div ref={hostRef} className="min-h-[65px] w-full" />;
});
