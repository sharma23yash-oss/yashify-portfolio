'use client';

/* eslint-disable @next/next/no-img-element */

import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BellRing, MonitorPlay, Play } from 'lucide-react';
import { ExternalAnchor, Reveal, SpotCard } from '@/components/ui/primitives';
import { EASE, FOCUS, FOCUS_ON_DARK, ICON_TILE, cn } from '@/components/ui/tokens';

export type YouTubeVideo = {
  /** a YouTube link (watch, youtu.be, shorts, embed) or the 11-character video id */
  url: string;
  title: string;
};

export type YouTubeContent = {
  channelUrl: string;
  /** the welcome line, shown large in Brush Script MT */
  welcome: string;
  /** optional: the channel id (starts with "UC"). It adds a "Latest uploads" player that updates by itself. */
  channelId?: string;
  /** optional: hand-picked videos */
  videos: YouTubeVideo[];
};

const DEVELOPMENT = process.env.NODE_ENV !== 'production';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE = /\/(@[\w.-]+)/;
const PATH_KINDS = ['embed', 'shorts', 'live', 'v'];

/** A tapered brush stroke, drawn as one filled shape. */
const BRUSH_PATH =
  'M4 27 C 70 9, 170 5, 270 13 C 360 20, 450 13, 516 6 C 456 27, 372 37, 270 32 C 170 28, 80 41, 4 27 Z';

/** Pulls the 11-character video id out of whatever link was pasted. */
export function videoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^(www|m)\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/')[1] ?? '';
      return VIDEO_ID.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && VIDEO_ID.test(fromQuery)) return fromQuery;
      const [kind = '', id = ''] = url.pathname.split('/').filter(Boolean);
      if (PATH_KINDS.includes(kind) && VIDEO_ID.test(id)) return id;
    }
  } catch {
    // not a link
  }
  return null;
}

const embedSrc = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;

/** A channel's uploads playlist id is the channel id with "UC" swapped for "UU". */
const uploadsSrc = (channelId: string) =>
  `https://www.youtube-nocookie.com/embed/videoseries?list=UU${channelId.slice(2)}&autoplay=1&rel=0&playsinline=1`;

const thumbnailSrc = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function handleOf(channelUrl: string): string {
  return HANDLE.exec(channelUrl)?.[1] ?? '';
}

function subscribeUrl(channelUrl: string): string {
  try {
    const url = new URL(channelUrl);
    url.searchParams.set('sub_confirmation', '1');
    return url.toString();
  } catch {
    return channelUrl;
  }
}

/* ---------------------------------- pieces ---------------------------------- */

function BrushStroke() {
  const reduce = useReducedMotion();
  const gradient = useId().replace(/[^A-Za-z0-9_-]/g, '');
  return (
    <motion.div
      aria-hidden="true"
      initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 1.2, delay: 0.45, ease: EASE }}
      className="mx-auto mt-3 w-full max-w-md sm:mt-5"
    >
      <svg viewBox="0 0 520 44" focusable="false" className="block h-auto w-full">
        <defs>
          <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0B1F3A" />
            <stop offset="0.55" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <path d={BRUSH_PATH} fill={`url(#${gradient})`} />
      </svg>
    </motion.div>
  );
}

function ChannelCard({ channelUrl, handle }: { channelUrl: string; handle: string }) {
  const display = handle || 'Our YouTube channel';
  return (
    <div className="ys-beam relative overflow-hidden rounded-3xl bg-[#0B1F3A] p-6 text-white shadow-[0_30px_60px_-30px_rgba(11,31,58,0.7)] sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.35),transparent)]"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className={cn(ICON_TILE, 'bg-white/10 shadow-none ring-1 ring-white/25')}>
            <MonitorPlay className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">YouTube channel</p>
            <p className="mt-1 break-words font-serif text-2xl font-semibold leading-tight">{display}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <ExternalAnchor
            href={subscribeUrl(channelUrl)}
            label={`Subscribe to ${display} on YouTube`}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1F3A] transition-colors duration-200 hover:bg-teal-50',
              FOCUS_ON_DARK,
            )}
          >
            <BellRing className="h-4 w-4" aria-hidden="true" />
            Subscribe
          </ExternalAnchor>
          <ExternalAnchor
            href={channelUrl}
            label={`Visit channel, ${display} on YouTube`}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10',
              FOCUS_ON_DARK,
            )}
          >
            Visit channel
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </ExternalAnchor>
        </div>
      </div>
    </div>
  );
}

/**
 * A video that costs nothing until it is played: the card shows a thumbnail, and only a click
 * loads the player (from youtube-nocookie.com). Without a poster it shows a plain navy frame.
 */
function VideoCard({
  title,
  src,
  poster,
  heading,
}: {
  title: string;
  src: string;
  poster?: string;
  heading: 'h2' | 'h3';
}) {
  const [playing, setPlaying] = useState(false);
  const Heading = heading;
  return (
    <SpotCard lift={playing ? 0 : 4} className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-[#0B1F3A]">
        {playing ? (
          <iframe
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className={cn('group absolute inset-0 block w-full', FOCUS)}
          >
            {poster ? (
              <img
                src={poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.45),transparent_60%)]"
              />
            )}
            <span
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center bg-[#0B1F3A]/15 transition-colors duration-300 group-hover:bg-[#0B1F3A]/30"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#0B1F3A] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <Heading className="p-5 font-serif text-lg font-semibold leading-snug text-[#0B1F3A]">{title}</Heading>
    </SpotCard>
  );
}

function DevelopmentHint() {
  if (!DEVELOPMENT) return null;
  return (
    <p className="mx-auto mt-10 max-w-xl rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
      Only you see this note, and only while developing: set <code>channelId</code> (it starts with UC) or add{' '}
      <code>videos</code> to <code>YOUTUBE</code> near the top of <code>app/page.tsx</code> to show videos here.
    </p>
  );
}

/* ----------------------------------- panel ----------------------------------- */

export function YouTubePanel({ content }: { content: YouTubeContent }) {
  const { channelUrl, welcome, channelId, videos } = content;
  const handle = handleOf(channelUrl);
  const uploads = channelId && CHANNEL_ID.test(channelId) ? channelId : null;
  const picked = videos.flatMap((video) => {
    const id = videoId(video.url);
    return id ? [{ id, title: video.title }] : [];
  });

  return (
    <section aria-labelledby="youtube-title" className="relative overflow-hidden py-14 sm:py-20">
      <div
        aria-hidden="true"
        className="ys-orb pointer-events-none absolute inset-x-0 top-0 mx-auto h-[26rem] w-[26rem] max-w-full rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.22),transparent)]"
      />
      <div
        aria-hidden="true"
        className="ys-orb pointer-events-none absolute right-0 top-40 h-80 w-80 max-w-full rounded-full bg-[radial-gradient(closest-side,rgba(48,84,168,0.14),transparent)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">YouTube</p>
          <h1
            id="youtube-title"
            className="ys-script mx-auto mt-4 max-w-4xl text-balance text-5xl leading-[1.12] text-[#0B1F3A] sm:text-6xl lg:text-7xl"
          >
            {welcome}
          </h1>
          <BrushStroke />
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-800">
            Subscribe to the channel to catch every new video.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto mt-10 max-w-3xl">
          <ChannelCard channelUrl={channelUrl} handle={handle} />
        </Reveal>

        {uploads ? (
          <Reveal delay={0.1} className="mx-auto mt-14 max-w-3xl">
            <VideoCard title="Latest uploads" src={uploadsSrc(uploads)} heading="h2" />
          </Reveal>
        ) : null}

        {picked.length > 0 ? (
          <div className="mt-14">
            <h2 className="mb-6 text-center font-serif text-2xl font-semibold text-[#0B1F3A]">Videos</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {picked.map((video, index) => (
                <Reveal key={video.id} delay={Math.min(index, 5) * 0.08} className="h-full">
                  <VideoCard title={video.title} src={embedSrc(video.id)} poster={thumbnailSrc(video.id)} heading="h3" />
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}

        {!uploads && picked.length === 0 ? <DevelopmentHint /> : null}
      </div>
    </section>
  );
}
