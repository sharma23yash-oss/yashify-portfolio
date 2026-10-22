/**
 * The AI services listed on the Yashify AI tab. Add an entry to AI_TOOLS and it shows up in the
 * scrolling strip and in the directory (and, when it has a `handoff`, it can take your prompt along).
 */

export type AiCategory = 'assistant' | 'research' | 'code' | 'create';

/**
 * How a prompt travels to the tool:
 *  - { base, param }  the prompt goes into the link, as base?param=<prompt>, so the tool opens with it filled in
 *  - 'copy' or nothing  the tool has no such link; the prompt is copied so it can be pasted
 */
export type AiHandoff = { base: string; param: string } | 'copy';

export type AiTool = {
  id: string;
  name: string;
  /** two characters shown on the tile (a monogram, not a logo) */
  mark: string;
  category: AiCategory;
  blurb: string;
  url: string;
  handoff?: AiHandoff;
};

export const AI_CATEGORIES: ReadonlyArray<{ id: AiCategory; label: string }> = [
  { id: 'assistant', label: 'Assistants' },
  { id: 'research', label: 'Research' },
  { id: 'code', label: 'Coding' },
  { id: 'create', label: 'Create' },
];

/** The big names that get their own buttons under the prompt box, in this order. */
export const LAUNCHER_IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot', 'grok'] as const;

export const AI_TOOLS: readonly AiTool[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    mark: 'CG',
    category: 'assistant',
    blurb: 'General-purpose assistant for writing, analysis, coding and everyday questions.',
    url: 'https://chatgpt.com/',
    handoff: { base: 'https://chatgpt.com/', param: 'q' },
  },
  {
    id: 'claude',
    name: 'Claude',
    mark: 'Cl',
    category: 'assistant',
    blurb: 'Assistant for long documents, careful reasoning, writing and code.',
    url: 'https://claude.ai/',
    handoff: { base: 'https://claude.ai/new', param: 'q' },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    mark: 'Ge',
    category: 'assistant',
    blurb: 'Assistant that works alongside Google Search and Google apps.',
    url: 'https://gemini.google.com/app',
    handoff: 'copy',
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    mark: 'MC',
    category: 'assistant',
    blurb: 'Assistant for web answers, writing and everyday tasks on Windows and the web.',
    url: 'https://copilot.microsoft.com/',
    handoff: { base: 'https://copilot.microsoft.com/', param: 'q' },
  },
  {
    id: 'grok',
    name: 'Grok',
    mark: 'Gk',
    category: 'assistant',
    blurb: 'Conversational assistant built around up-to-the-minute information.',
    url: 'https://grok.com/',
    handoff: 'copy',
  },
  {
    id: 'meta-ai',
    name: 'Meta AI',
    mark: 'MA',
    category: 'assistant',
    blurb: 'Assistant for questions, writing and creative ideas.',
    url: 'https://www.meta.ai/',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    mark: 'DS',
    category: 'assistant',
    blurb: 'Chat assistant known for step-by-step reasoning, maths and coding.',
    url: 'https://chat.deepseek.com/',
  },
  {
    id: 'qwen',
    name: 'Qwen Chat',
    mark: 'QC',
    category: 'assistant',
    blurb: 'Chat assistant for writing, coding and search.',
    url: 'https://chat.qwen.ai/',
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    mark: 'MV',
    category: 'assistant',
    blurb: "Mistral's assistant for chat, productivity and coding.",
    url: 'https://chat.mistral.ai/',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    mark: 'Px',
    category: 'research',
    blurb: 'Answer engine that searches the web and shows its sources.',
    url: 'https://www.perplexity.ai/',
    handoff: { base: 'https://www.perplexity.ai/search', param: 'q' },
  },
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    mark: 'NL',
    category: 'research',
    blurb: 'Notebook that answers questions from the documents you add to it.',
    url: 'https://notebooklm.google.com/',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    mark: 'GC',
    category: 'code',
    blurb: 'Coding assistant inside your editor, for completions, chat and refactoring.',
    url: 'https://github.com/features/copilot',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    mark: 'Cu',
    category: 'code',
    blurb: 'Code editor built around AI that can read and edit a whole project.',
    url: 'https://cursor.com/',
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    mark: 'Mj',
    category: 'create',
    blurb: 'Turns text prompts into images with a distinctive artistic style.',
    url: 'https://www.midjourney.com/',
  },
  {
    id: 'runway',
    name: 'Runway',
    mark: 'Rw',
    category: 'create',
    blurb: 'Video generation and editing tools driven by AI.',
    url: 'https://runwayml.com/',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    mark: 'El',
    category: 'create',
    blurb: 'Realistic text-to-speech, voice and audio tools.',
    url: 'https://elevenlabs.io/',
  },
  {
    id: 'suno',
    name: 'Suno',
    mark: 'Su',
    category: 'create',
    blurb: 'Turns a text prompt into a complete song.',
    url: 'https://suno.com/',
  },
  {
    id: 'gamma',
    name: 'Gamma',
    mark: 'Gm',
    category: 'create',
    blurb: 'Generates presentations, documents and web pages from a short brief.',
    url: 'https://gamma.app/',
  },
];
