'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheck, LoaderCircle, Send } from 'lucide-react';
import {
  BUDGET_OPTIONS,
  HONEYPOT_FIELD,
  TIMELINE_OPTIONS,
  briefSchema,
  type BriefInput,
  type ContactResponse,
} from '@/lib/contact-schema';
import { PACKAGE_OPTIONS } from '@/lib/services';
import { SITE } from '@/lib/site';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FIELD, FOCUS, cn } from '@/components/ui/tokens';
import { PACKAGE_EVENT, PACKAGE_FIELD_ID } from './package-event';
import { Turnstile, type TurnstileHandle } from './Turnstile';

/**
 * The project-brief form on /hire. Validated in the browser with the same zod schema the server
 * uses, then posted to /api/contact. Nothing is stored; the server only sends emails.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const LABEL = 'block text-sm font-semibold text-slate-800';
const ERROR_TEXT = 'mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700';
const MESSAGE_MAX = 3000;

const EMPTY: BriefInput = {
  name: '',
  email: '',
  package: '',
  budget: '' as BriefInput['budget'],
  timeline: '' as BriefInput['timeline'],
  message: '',
  [HONEYPOT_FIELD]: '',
  turnstileToken: '',
};

type FieldName = keyof BriefInput;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={ERROR_TEXT}>
      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`brief-${name}`} className={LABEL}>
        {label}
      </label>
      {hint ? (
        <p id={`brief-${name}-hint`} className="mt-1 text-sm text-slate-600">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      <FieldError id={`brief-${name}-error`} message={error} />
    </div>
  );
}

/** aria wiring for one control: invalid state plus the hint and error it should read out. */
function described(name: string, hasError: boolean, hasHint = false) {
  const ids = [hasHint && `brief-${name}-hint`, hasError && `brief-${name}-error`].filter(Boolean).join(' ');
  return { 'aria-invalid': hasError || undefined, 'aria-describedby': ids || undefined };
}

export function BriefForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captchaBlocked, setCaptchaBlocked] = useState(false);
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BriefInput>({
    resolver: zodResolver(briefSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  });

  // "Request this" on a service card preselects that package here.
  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!PACKAGE_OPTIONS.some((o) => o.value === id)) return;
      setSent(false);
      setValue('package', id, { shouldValidate: true, shouldDirty: true });
    };
    window.addEventListener(PACKAGE_EVENT, onSelect);
    return () => window.removeEventListener(PACKAGE_EVENT, onSelect);
  }, [setValue]);

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const messageLength = useWatch({ control, name: 'message' })?.length ?? 0;

  const onSubmit = async (values: BriefInput) => {
    setServerError(null);
    let data: ContactResponse | null = null;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      data = (await res.json().catch(() => null)) as ContactResponse | null;
      if (res.ok && data?.ok) {
        reset(EMPTY);
        setSent(true);
        return;
      }
    } catch {
      data = null;
    }

    if (data && !data.ok) {
      setServerError(data.error);
      for (const [field, message] of Object.entries(data.fieldErrors ?? {})) {
        if (message) setError(field as FieldName, { type: 'server', message });
      }
    } else {
      setServerError(`Your brief couldn't be sent (network problem). Please try again, or email ${SITE.email}.`);
    }
    // Turnstile tokens work once; get a fresh one for the next try.
    setValue('turnstileToken', '');
    turnstileRef.current?.reset();
  };

  if (!SITE_KEY) {
    return (
      <div className={cn(CARD, 'px-6 py-8 text-center')}>
        <p className="text-base text-slate-700">
          The brief form is being set up. Until then, email your brief to{' '}
          <a href={`mailto:${SITE.email}`} className={cn('font-semibold text-[#0B1F3A] underline underline-offset-4', FOCUS)}>
            {SITE.email}
          </a>
          .
        </p>
        {process.env.NODE_ENV === 'development' ? (
          <p className="mt-3 text-sm font-medium text-amber-900">
            Dev note: set NEXT_PUBLIC_TURNSTILE_SITE_KEY (see .env.example) to show the form.
          </p>
        ) : null}
      </div>
    );
  }

  if (sent) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn(CARD, 'px-6 py-10 text-center outline-none')}
      >
        <CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-teal-700" />
        <h3 className="mt-4 font-serif text-2xl font-semibold text-[#0B1F3A]">Brief received. Thank you!</h3>
        <p className="mx-auto mt-3 max-w-md text-pretty text-slate-700">
          A confirmation is on its way to your inbox. I’ll reply within 1–2 working days.
        </p>
        <button type="button" onClick={() => setSent(false)} className={cn(BTN_SECONDARY, 'mt-6', FOCUS)}>
          Send another brief
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
      aria-describedby={serverError ? 'brief-server-error' : undefined}
      className={cn(CARD, 'relative space-y-6 px-5 py-7 sm:px-8 sm:py-9')}
    >
      {serverError ? (
        <div
          id="brief-server-error"
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {serverError}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="name" label="Your name" error={errors.name?.message}>
          <input
            id="brief-name"
            type="text"
            autoComplete="name"
            className={FIELD}
            {...described('name', !!errors.name)}
            {...register('name')}
          />
        </Field>
        <Field name="email" label="Email" error={errors.email?.message}>
          <input
            id="brief-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={FIELD}
            {...described('email', !!errors.email)}
            {...register('email')}
          />
        </Field>
      </div>

      <Field name="package" label="Package" error={errors.package?.message}>
        <select id={PACKAGE_FIELD_ID} className={FIELD} {...described('package', !!errors.package)} {...register('package')}>
          <option value="" disabled>
            Choose a package
          </option>
          {PACKAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="budget" label="Budget range" error={errors.budget?.message}>
          <select id="brief-budget" className={FIELD} {...described('budget', !!errors.budget)} {...register('budget')}>
            <option value="" disabled>
              Choose a range
            </option>
            {BUDGET_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field name="timeline" label="Timeline" error={errors.timeline?.message}>
          <select id="brief-timeline" className={FIELD} {...described('timeline', !!errors.timeline)} {...register('timeline')}>
            <option value="" disabled>
              When do you need it?
            </option>
            {TIMELINE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        name="message"
        label="About the project"
        hint="What you need, who it’s for, and any links or deadlines."
        error={errors.message?.message}
      >
        <textarea
          id="brief-message"
          rows={6}
          maxLength={MESSAGE_MAX}
          className={cn(FIELD, 'resize-y')}
          {...described('message', !!errors.message, true)}
          {...register('message')}
        />
        <p className="mt-1 text-right text-xs text-slate-600" aria-live="polite" aria-atomic="true">
          {messageLength > MESSAGE_MAX - 300 ? `${messageLength} / ${MESSAGE_MAX}` : null}
        </p>
      </Field>

      {/* Honeypot: hidden from people and screen readers; bots that fill every field give themselves away. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="brief-company-website">Company website (leave empty)</label>
        <input id="brief-company-website" type="text" tabIndex={-1} autoComplete="off" {...register(HONEYPOT_FIELD)} />
      </div>

      <div>
        <p className={LABEL} id="brief-turnstile-label">
          Quick spam check
        </p>
        <div className="mt-2" role="group" aria-labelledby="brief-turnstile-label">
          {captchaBlocked ? (
            <p className={ERROR_TEXT}>
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              The spam check couldn’t load (an ad blocker can cause this). Please allow challenges.cloudflare.com, or
              email {SITE.email}.
            </p>
          ) : (
            <Turnstile
              ref={turnstileRef}
              siteKey={SITE_KEY}
              onToken={(token) => setValue('turnstileToken', token, { shouldValidate: true })}
              onClear={() => setValue('turnstileToken', '')}
              onLoadError={() => setCaptchaBlocked(true)}
            />
          )}
        </div>
        <FieldError id="brief-turnstileToken-error" message={errors.turnstileToken?.message} />
      </div>

      <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Your brief is emailed to me and not stored anywhere else.</p>
        <button type="submit" disabled={isSubmitting} className={cn(BTN_PRIMARY, 'px-7 py-3 text-base', FOCUS)}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="h-5 w-5" />
          )}
          {isSubmitting ? 'Sending…' : 'Send brief'}
        </button>
      </div>
    </form>
  );
}
