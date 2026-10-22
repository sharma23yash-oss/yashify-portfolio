'use client';

import { useRef, type ComponentPropsWithoutRef, type PointerEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CARD, CARD_HOVER, EASE, LIFT, RULE_STYLE, cn } from './tokens';

/* Shared building blocks, moved out of app/page.tsx unchanged so the tab panels can use them too. */

/** Every outbound link goes through here: new tab, no opener, announced to screen readers. */
export function ExternalAnchor({
  label,
  children,
  ...rest
}: ComponentPropsWithoutRef<'a'> & { label?: string }) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ? `${label} (opens in a new tab)` : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      // a finished blur(0px) would still keep the block on its own compositing layer
      onAnimationComplete={() => {
        if (ref.current) ref.current.style.filter = 'none';
      }}
    >
      {children}
    </motion.div>
  );
}

/** The page title of a tab (level 1) is a little larger than a section title (level 2, the default). */
const HEADING_2 = 'mt-3 font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl';
const HEADING_1 = 'mt-3 font-serif text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl';

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  level = 2,
  id,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  level?: 1 | 2;
  id?: string;
}) {
  const Title = level === 1 ? 'h1' : 'h2';
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">{eyebrow}</p>
      <Title id={id} className={level === 1 ? HEADING_1 : HEADING_2}>
        {title}
      </Title>
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        style={RULE_STYLE}
        className="mx-auto mt-5 block h-0.5 w-16 origin-center rounded-full"
      />
      {blurb ? (
        <p className="mt-5 text-pretty text-base leading-relaxed text-slate-800">{blurb}</p>
      ) : null}
    </Reveal>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

/** Writes the pointer position into CSS variables, so a card's spotlight follows the cursor without re-rendering. */
export function trackPointer(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const box = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - box.left}px`);
  el.style.setProperty('--my', `${e.clientY - box.top}px`);
}

/** A card that lifts on hover and lights up under the cursor (the idea behind Magic UI's MagicCard). */
export function SpotCard({
  children,
  className,
  lift = 5,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.article
      onPointerMove={trackPointer}
      whileHover={{ y: -lift }}
      transition={LIFT}
      className={cn(CARD, CARD_HOVER, 'ys-spot', className)}
    >
      {children}
    </motion.article>
  );
}
