'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BTN_PRIMARY, FOCUS, cn } from '@/components/ui/tokens';
import { requestPackage } from './package-event';

/** Framer Motion honours the visitor's reduced-motion setting everywhere inside (same as the home page). */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** "Request this" on a service card: preselects the package in the brief form and jumps to it. */
export function RequestPackageButton({ packageId, title }: { packageId: string; title: string }) {
  return (
    <button
      type="button"
      onClick={() => requestPackage(packageId)}
      aria-label={`Request this: ${title}`}
      className={cn(BTN_PRIMARY, 'w-full', FOCUS)}
    >
      Request this
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
