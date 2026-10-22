'use client';

import { useId, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, Search, X } from 'lucide-react';
import { ExternalAnchor, Reveal, SectionHeading, SpotCard } from '@/components/ui/primitives';
import { BTN_SECONDARY, CARD, FIELD, FOCUS, cn } from '@/components/ui/tokens';
import { copyText } from './copy';
import { AI_CATEGORIES, AI_TOOLS, LAUNCHER_IDS, type AiCategory, type AiTool } from './ai-tools';

/**
 * Yashify AI is a launchpad, not a chatbot: it does not run a model of its own. You write a prompt
 * once, and it opens the assistant you pick with that prompt filled in (when the assistant's link
 * allows it) or copied to the clipboard (when it does not). Nothing you type is sent to this site.
 */

type CategoryFilter = AiCategory | 'all';

type Launch = { href: string; prefilled: boolean };

const PROMPT_LIMIT = 1500;
/** Very long links are refused by some servers, so past this length the prompt is copied instead. */
const MAX_LINK_LENGTH = 7000;

const STARTERS = [
  {
    label: 'DCF basics',
    prompt: 'Explain discounted cash flow (DCF) valuation step by step, with a simple worked example.',
  },
  {
    label: 'Compare two companies',
    prompt: 'How do I compare two companies using P/E, P/B and ROE? Explain what each number tells me.',
  },
  {
    label: 'What moves the Nifty',
    prompt: 'What usually drives the Nifty 50 index up or down? Explain in simple terms.',
  },
  {
    label: 'NISM study plan',
    prompt: 'Make a 4-week study plan for a NISM certification exam, with daily topics and revision slots.',
  },
] as const;

const FILTERS: ReadonlyArray<{ id: CategoryFilter; label: string }> = [{ id: 'all', label: 'All' }, ...AI_CATEGORIES];

const CATEGORY_LABEL: Record<AiCategory, string> = {
  assistant: 'Assistant',
  research: 'Research',
  code: 'Coding',
  create: 'Create',
};

const TILE_TONE: Record<AiCategory, string> = {
  assistant: 'bg-[#0B1F3A]',
  research: 'bg-[#3054A8]',
  code: 'bg-teal-700',
  create: 'bg-emerald-700',
};

const TILE =
  'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-tight text-white shadow-[0_8px_16px_-10px_rgba(11,31,58,0.6)]';
const TILE_SMALL = 'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white';
/** Draws the monogram from `data-mark`, so the printed text of a launcher link is only the tool's name. */
const TILE_GLYPH = 'before:content-[attr(data-mark)]';

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#0B1F3A]/40 hover:shadow-[0_8px_18px_-10px_rgba(15,23,42,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0';

const CHIP =
  'rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200';
const CHIP_ON = 'border-[#0B1F3A] bg-[#0B1F3A] text-white';
const CHIP_OFF = 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-[#0B1F3A]';

const LAUNCHERS = LAUNCHER_IDS.flatMap((id) => AI_TOOLS.filter((tool) => tool.id === id));

/** The strip of names is drawn twice so that it can loop without a jump. */
const MARQUEE_COPIES = [0, 1] as const;

const SUGGEST_SUBJECT = 'Suggest an AI tool for Yashify AI';

/** Where the prompt goes for this tool: into the link when the tool allows it, otherwise just the tool's address. */
function buildLaunch(tool: AiTool, prompt: string): Launch {
  const text = prompt.trim();
  const handoff = tool.handoff;
  if (!text || !handoff || handoff === 'copy') return { href: tool.url, prefilled: false };
  const href = `${handoff.base}?${handoff.param}=${encodeURIComponent(text)}`;
  return href.length <= MAX_LINK_LENGTH ? { href, prefilled: true } : { href: tool.url, prefilled: false };
}

function verbFor(prompt: string, launch: Launch): string {
  if (!prompt.trim()) return 'Open';
  return launch.prefilled ? 'Ask' : 'Copy prompt & open';
}

function noticeFor(tool: AiTool, launch: Launch, copied: boolean): string {
  if (launch.prefilled) {
    return copied
      ? `Opening ${tool.name} with your prompt. A copy is also on your clipboard.`
      : `Opening ${tool.name} with your prompt.`;
  }
  return copied
    ? `Prompt copied. Paste it into ${tool.name} when it opens.`
    : `Could not copy automatically. Select your prompt above, copy it, and paste it into ${tool.name}.`;
}

/* ---------------------------------- pieces ---------------------------------- */

function Marquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="mt-10">
      <div className="mx-auto flex max-w-6xl justify-end px-4 sm:px-6">
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#0B1F3A]',
            FOCUS,
          )}
        >
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          {paused ? 'Play the scrolling names' : 'Pause the scrolling names'}
        </button>
      </div>
      <div
        aria-hidden="true"
        className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      >
        <div data-paused={paused} className="ys-marquee py-2">
          {MARQUEE_COPIES.map((copy) =>
            AI_TOOLS.map((tool) => (
              <span
                key={`${copy}-${tool.id}`}
                className="mr-3 inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-[#0B1F3A] shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              >
                <span className={cn(TILE_SMALL, TILE_TONE[tool.category])}>{tool.mark}</span>
                {tool.name}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, prompt, onLaunch }: { tool: AiTool; prompt: string; onLaunch: (tool: AiTool, launch: Launch) => void }) {
  const launch = buildLaunch(tool, prompt);
  const verb = verbFor(prompt, launch);
  return (
    <SpotCard className="flex h-full flex-col p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={cn(TILE, TILE_TONE[tool.category])}>
          {tool.mark}
        </span>
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold leading-tight text-[#0B1F3A]">{tool.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-700">{CATEGORY_LABEL[tool.category]}</p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{tool.blurb}</p>
      <ExternalAnchor
        href={launch.href}
        label={`${verb} ${tool.name}`}
        onClick={() => onLaunch(tool, launch)}
        className={cn(BTN_SECONDARY, 'mt-4 w-full px-4 py-2.5', FOCUS)}
      >
        {verb}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </ExternalAnchor>
    </SpotCard>
  );
}

/* ----------------------------------- panel ----------------------------------- */

export function AiPanel({ contactEmail }: { contactEmail: string }) {
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const promptId = useId();
  const countId = useId();
  const resultsId = useId();
  const searchId = useId();

  const needle = query.trim().toLowerCase();
  const shown = AI_TOOLS.filter(
    (tool) =>
      (category === 'all' || tool.category === category) &&
      (!needle || `${tool.name} ${tool.blurb} ${CATEGORY_LABEL[tool.category]}`.toLowerCase().includes(needle)),
  );

  const onLaunch = (tool: AiTool, launch: Launch) => {
    const text = prompt.trim();
    if (!text) {
      setNotice('');
      return;
    }
    void copyText(text).then((copied) => setNotice(noticeFor(tool, launch, copied)));
  };

  const chooseStarter = (text: string) => {
    setPrompt(text);
    setNotice('');
    promptRef.current?.focus();
  };

  const suggestHref = `mailto:${contactEmail}?subject=${encodeURIComponent(SUGGEST_SUBJECT)}`;

  return (
    <section aria-labelledby="ai-title" className="py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          level={1}
          id="ai-title"
          eyebrow="Yashify AI"
          title="One launchpad for every AI"
          blurb="Write a prompt once and take it to the assistant you like, or browse the directory to find the right tool for the job."
        />
      </div>

      <Marquee />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto mt-8 max-w-3xl">
          <div className={cn(CARD, 'p-5 sm:p-8')}>
            <h2 className="font-serif text-2xl font-semibold text-[#0B1F3A]">Start with a prompt</h2>

            <label htmlFor={promptId} className="mt-5 block text-sm font-semibold text-[#0B1F3A]">
              Your prompt
            </label>
            <textarea
              id={promptId}
              ref={promptRef}
              rows={4}
              maxLength={PROMPT_LIMIT}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setNotice('');
              }}
              aria-describedby={countId}
              placeholder="Ask anything. For example: Explain the DuPont analysis with a worked example."
              className={cn(FIELD, 'mt-2 resize-y leading-relaxed')}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-700">
              <span id={countId}>
                {prompt.length} / {PROMPT_LIMIT} characters
              </span>
              {prompt ? (
                <button
                  type="button"
                  onClick={() => {
                    setPrompt('');
                    setNotice('');
                    promptRef.current?.focus();
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors hover:bg-slate-100 hover:text-[#0B1F3A]',
                    FOCUS,
                  )}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-[#0B1F3A]">Or start from an idea</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => chooseStarter(starter.prompt)}
                    className={cn(CHIP, CHIP_OFF, FOCUS)}
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 border-t border-slate-100 pt-6">
              <p className="text-sm font-semibold text-[#0B1F3A]">{prompt.trim() ? 'Send your prompt to' : 'Open an assistant'}</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {LAUNCHERS.map((tool) => {
                  const launch = buildLaunch(tool, prompt);
                  return (
                    <ExternalAnchor
                      key={tool.id}
                      href={launch.href}
                      label={`${verbFor(prompt, launch)} ${tool.name}`}
                      onClick={() => onLaunch(tool, launch)}
                      className={cn(PILL, FOCUS)}
                    >
                      <span
                        aria-hidden="true"
                        data-mark={tool.mark}
                        className={cn(TILE_SMALL, TILE_GLYPH, TILE_TONE[tool.category])}
                      />
                      {tool.name}
                      <ArrowUpRight className="h-4 w-4 text-slate-600" aria-hidden="true" />
                    </ExternalAnchor>
                  );
                })}
              </div>
              <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm font-medium text-emerald-800">
                {notice}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                ChatGPT, Claude, Perplexity and Microsoft Copilot open with your prompt filled in. For the others your
                prompt is copied, so you can paste it. Your prompt stays in this browser until you open an assistant.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-20">
          <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            AI directory
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base leading-relaxed text-slate-800">
            Search by name, or filter by what you want to do.
          </p>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4">
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Search AI tools
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-controls={resultsId}
                autoComplete="off"
                placeholder="Search AI tools"
                className={cn(FIELD, 'pl-12')}
              />
            </div>
            <div role="group" aria-label="Filter by category" className="flex flex-wrap justify-center gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={category === filter.id}
                  onClick={() => setCategory(filter.id)}
                  className={cn(CHIP, category === filter.id ? CHIP_ON : CHIP_OFF, FOCUS)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <p role="status" aria-live="polite" className="mt-6 text-center text-sm text-slate-700">
            {shown.length} {shown.length === 1 ? 'tool' : 'tools'}
          </p>

          <div id={resultsId} className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((tool, index) => (
              <Reveal key={tool.id} delay={Math.min(index, 5) * 0.05} className="h-full">
                <ToolCard tool={tool} prompt={prompt} onLaunch={onLaunch} />
              </Reveal>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 text-center text-base text-slate-800">
              Nothing matches that search. Try another word, or choose All.
            </p>
          ) : null}

          <p className="mt-10 text-center text-sm text-slate-700">
            Missing a tool?{' '}
            <a href={suggestHref} className={cn('rounded font-semibold text-[#0B1F3A] underline underline-offset-4', FOCUS)}>
              Suggest one by email
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
