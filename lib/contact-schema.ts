import { z } from 'zod';
import { PACKAGE_OPTIONS } from './services';

/**
 * The project-brief form. The same rules run in the browser (react-hook-form) and again on the
 * server (app/api/contact/route.ts), so nothing the browser skips can get through.
 */

export const BUDGET_OPTIONS = [
  'Under ₹10,000',
  '₹10,000–25,000',
  '₹25,000–50,000',
  '₹50,000–1,00,000',
  'Above ₹1,00,000',
  'Not sure yet',
] as const;

export const TIMELINE_OPTIONS = ['As soon as possible', '2–4 weeks', '1–2 months', 'Flexible'] as const;

const PACKAGE_VALUES = PACKAGE_OPTIONS.map((o) => o.value);

/** Name of the hidden honeypot field. People never see it; bots that fill every field do. */
export const HONEYPOT_FIELD = 'company_website';

export const briefSchema = z.object({
  name: z
    .string({ error: 'Please enter your name.' })
    .trim()
    .min(2, 'Please enter your name.')
    .max(80, 'Please keep your name under 80 characters.')
    // the name goes into the email subject line, where a line break could forge headers
    .refine((v) => !/[\r\n]/.test(v), 'Please enter your name on one line.'),
  // trim first, so an address pasted with a trailing space still passes
  email: z
    .string({ error: 'Please enter a valid email address.' })
    .trim()
    .max(200, 'Please enter a valid email address.')
    .pipe(z.email({ error: 'Please enter a valid email address.' })),
  package: z
    .string({ error: 'Please choose a package.' })
    .refine((v) => PACKAGE_VALUES.includes(v), 'Please choose a package.'),
  budget: z.enum(BUDGET_OPTIONS, { error: 'Please choose a budget range.' }),
  timeline: z.enum(TIMELINE_OPTIONS, { error: 'Please choose a timeline.' }),
  message: z
    .string({ error: 'Please describe the project.' })
    .trim()
    .min(20, 'Please describe the project in at least 20 characters.')
    .max(3000, 'Please keep the message under 3,000 characters.'),
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
  turnstileToken: z
    .string({ error: 'Please complete the “I’m human” check.' })
    .min(1, 'Please complete the “I’m human” check.')
    .max(4096),
});

export type BriefInput = z.input<typeof briefSchema>;
export type Brief = z.output<typeof briefSchema>;

/** What /api/contact answers. `fieldErrors` only comes back when server validation fails. */
export type ContactResponse =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof BriefInput, string>> };
