'use client';

import {
  ArrowUpRight,
  Check,
  Copy,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Presentation,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Chip, ExternalAnchor, Reveal, SectionHeading, SpotCard } from '@/components/ui/primitives';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FOCUS, ICON_TILE, cn } from '@/components/ui/tokens';
import { copySuffix, useCopy } from './copy';

export type DriveKind = 'pdf' | 'doc' | 'sheet' | 'slides' | 'video' | 'folder' | 'other';

export type DriveFile = {
  title: string;
  description?: string;
  kind: DriveKind;
  /** the Drive share link ("Anyone with the link") */
  href: string;
};

export type DriveContent = {
  /** optional: a shared Drive folder, adds an "Open the Drive folder" button */
  folderUrl?: string;
  files: DriveFile[];
};

const KINDS: Record<DriveKind, { label: string; Icon: LucideIcon }> = {
  pdf: { label: 'PDF', Icon: FileText },
  doc: { label: 'Doc', Icon: FileText },
  sheet: { label: 'Sheet', Icon: FileSpreadsheet },
  slides: { label: 'Slides', Icon: Presentation },
  video: { label: 'Video', Icon: Video },
  folder: { label: 'Folder', Icon: FolderOpen },
  other: { label: 'File', Icon: File },
};

const DEVELOPMENT = process.env.NODE_ENV !== 'production';

const SMALL_BUTTON = 'px-4 py-2';

function FileCard({ file, copied, failed, onCopy }: { file: DriveFile; copied: boolean; failed: boolean; onCopy: () => void }) {
  const { label, Icon } = KINDS[file.kind];
  return (
    <SpotCard className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className={ICON_TILE}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <Chip>{label}</Chip>
      </div>
      <h2 className="mt-5 font-serif text-xl font-semibold leading-snug text-[#0B1F3A]">{file.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{file.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <ExternalAnchor
          href={file.href}
          label={`Open ${file.title}`}
          className={cn(BTN_PRIMARY, SMALL_BUTTON, FOCUS)}
        >
          Open
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </ExternalAnchor>
        <button type="button" onClick={onCopy} className={cn(BTN_SECONDARY, SMALL_BUTTON, FOCUS)}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy link'}
          <span className="sr-only">
            {copySuffix(copied, failed)}
            {file.title}
          </span>
        </button>
      </div>
    </SpotCard>
  );
}

function EmptyState() {
  return (
    <Reveal className="mx-auto mt-12 max-w-xl">
      <div className={cn(CARD, 'p-8 text-center')}>
        <span className={cn(ICON_TILE, 'mx-auto')}>
          <FolderOpen className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-semibold text-[#0B1F3A]">New files are on the way</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Files shared from Google Drive will appear here.
        </p>
        {DEVELOPMENT ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-700">
            Only you see this note, and only while developing: add your shared files to <code>DRIVE.files</code> near
            the top of <code>app/page.tsx</code>.
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}

export function DrivePanel({ content }: { content: DriveContent }) {
  const { state, copy } = useCopy();
  const { files, folderUrl } = content;

  return (
    <section aria-labelledby="drive-title" className="py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          level={1}
          id="drive-title"
          eyebrow="Google Drive"
          title="Shareable files"
          blurb="Files I share publicly from Google Drive. Each one opens in Drive in a new tab."
        />

        {folderUrl ? (
          <Reveal delay={0.1} className="mt-10 flex justify-center">
            <ExternalAnchor
              href={folderUrl}
              label="Open the Drive folder"
              className={cn(BTN_PRIMARY, 'px-7 py-3.5 text-base', FOCUS)}
            >
              <FolderOpen className="h-5 w-5" aria-hidden="true" />
              Open the Drive folder
            </ExternalAnchor>
          </Reveal>
        ) : null}

        {files.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <Reveal key={file.href} delay={Math.min(index, 5) * 0.08} className="h-full">
                <FileCard
                  file={file}
                  copied={state?.key === file.href && state.ok}
                  failed={state?.key === file.href && !state.ok}
                  onCopy={() => void copy(file.href, file.href)}
                />
              </Reveal>
            ))}
          </div>
        ) : folderUrl ? null : (
          <EmptyState />
        )}

        <p role="status" aria-live="polite" className="sr-only">
          {state ? (state.ok ? 'Link copied to the clipboard' : 'Could not copy the link') : ''}
        </p>
      </div>
    </section>
  );
}
