import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text to the clipboard. Uses the Clipboard API and falls back to the older textarea trick. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // not allowed here (insecure page, permission denied): try the fallback
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * The words a screen reader hears after "Copy link", "Copied" or "Copy failed", followed by the item's name,
 * so that a page of identical buttons stays distinguishable ("Copy link to X", "Copied link to X").
 */
export function copySuffix(copied: boolean, failed: boolean): string {
  if (copied) return ' link to ';
  return failed ? ' for ' : ' to ';
}

export type CopyState = { key: string; ok: boolean } | null;

/**
 * `state` says which item was copied last (by the key you passed) and whether it worked.
 * It clears itself after `resetMs`, so a "Copied" label goes back to "Copy link".
 */
export function useCopy(resetMs = 2000) {
  const [state, setState] = useState<CopyState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (key: string, text: string) => {
      const ok = await copyText(text);
      setState({ key, ok });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState(null), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { state, copy };
}
