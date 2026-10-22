'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import SceneFrame, { type SceneProps } from './SceneFrame';
import { MarketTrendPoster } from './posters';

// The 3D code (three.js + react-three-fiber) is a separate chunk. It is requested only
// after SceneFrame's checks pass, never during the first load.
const MarketTrendScene = dynamic<SceneProps>(() => import('./MarketTrendScene'), { ssr: false });

type MarketTrendProps = {
  /** Tailwind classes placing the frame inside a `relative isolate` parent. Default: fill it. */
  className?: string;
  style?: CSSProperties;
  /** Render nothing below this viewport width in px. Default 0 (show on every screen). */
  minWidth?: number;
};

/** A floating 3D candlestick chart that tilts with the pointer. Decorative: aria-hidden, no pointer events. */
export function MarketTrend({ className, style, minWidth }: MarketTrendProps) {
  return (
    <SceneFrame
      Scene={MarketTrendScene}
      poster={<MarketTrendPoster />}
      className={className}
      style={style}
      minWidth={minWidth}
    />
  );
}
