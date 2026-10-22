'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import SceneFrame, { type SceneProps } from './SceneFrame';
import { DataMeshPoster } from './posters';

// The 3D code is a separate chunk, requested only after SceneFrame's checks pass.
const DataMeshScene = dynamic<SceneProps>(() => import('./DataMeshScene'), { ssr: false });

type DataMeshProps = {
  /** Tailwind classes placing the frame inside a `relative isolate` parent. Default: fill it. */
  className?: string;
  style?: CSSProperties;
  /** Render nothing below this viewport width in px. Default 0 (show on every screen). */
  minWidth?: number;
};

/** A 3D network of data blocks and nodes with packets flowing through it. Decorative: aria-hidden, no pointer events. */
export function DataMesh({ className, style, minWidth }: DataMeshProps) {
  return (
    <SceneFrame
      Scene={DataMeshScene}
      poster={<DataMeshPoster />}
      className={className}
      style={style}
      minWidth={minWidth}
    />
  );
}
