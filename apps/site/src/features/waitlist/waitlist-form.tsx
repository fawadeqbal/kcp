'use client';

import { Alert, Button, SelectField, TextField } from '@kcp/ui';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GlobeIcon } from '@/components/icons';
import { COUNTRY_CODES, COUNTRY_NAMES } from '@/lib/countries';
import { isolate } from '@/lib/format';
import { AGE_BANDS, joinWaitlist, type JoinResult } from './api';
import { isValid, validateWaitlist, type WaitlistErrors } from './validation';

const AGE_LABELS = { AGE_9_12: 'age912', AGE_13_16: 'age1316' } as const;

/**
 * The waitlist sign-up: parent's email, country and child's age band. The language is the
 * page's. The API sends a confirmation email (double opt-in); nothing is stored in the
 * browser.
 */
export function WaitlistForm() {
  const t = useTranslations('waitlist');
  const locale = useLocale();
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Exclude<JoinResult, 'sent'> | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const success = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sentTo) success.current?.focus();
  }, [sentTo]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      email: String(data.get('email') ?? '').trim(),
      countryCode: String(data.get('countryCode') ?? ''),
      ageBand: String(data.get('ageBand') ?? ''),
    };
    const found = validateWaitlist(input);
    setErrors(found);
    setProblem(null);
    if (!isValid(input, found)) {
      const first = (['email', 'countryCode', 'ageBand'] as const).find((field) => found[field]);
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setSending(true);
    const result = await joinWaitlist({ ...input, languageCode: locale });
    setSending(false);
    if (result === 'sent') setSentTo(input.email);
    else setProblem(result);
  }

  if (sentTo) {
    return (
      <div ref={success} tabIndex={-1} className="rounded-row">
        <Alert tone="success">
          <p className="text-lg font-bold">{t('successTitle')}</p>
          <p className="mt-1 text-ink">{t('success', { email: isolate(sentTo) })}</p>
        </Alert>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <TextField
        label={t('email')}
        name="email"
        type="email"
        dir="ltr"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        maxLength={254}
        hint={t('emailHint')}
        error={errors.email ? t(errors.email) : undefined}
      />
      <SelectField
        label={t('country')}
        name="countryCode"
        defaultValue=""
        error={errors.countryCode ? t(errors.countryCode) : undefined}
      >
        <option value="" disabled>
          {t('countryPlaceholder')}
        </option>
        {COUNTRY_CODES.map((code) => (
          <option key={code} value={code}>
            {COUNTRY_NAMES[code][locale]}
          </option>
        ))}
      </SelectField>
      <fieldset aria-describedby={errors.ageBand ? 'age-band-error' : undefined}>
        <legend className="font-medium">{t('ageBand')}</legend>
        <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
          {AGE_BANDS.map((band) => (
            <label
              key={band}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-row bg-surface px-4 py-2 has-checked:border-brand has-checked:bg-brand-100"
            >
              <input
                type="radio"
                name="ageBand"
                value={band}
                aria-invalid={errors.ageBand ? true : undefined}
                className="size-5 shrink-0 accent-primary"
              />
              {t(AGE_LABELS[band])}
            </label>
          ))}
        </div>
        {errors.ageBand ? (
          <p id="age-band-error" role="alert" className="mt-1.5 text-sm text-danger">
            {t(errors.ageBand)}
          </p>
        ) : null}
      </fieldset>
      <p className="flex items-center gap-2 text-sm text-muted">
        <GlobeIcon className="size-4" />
        {t('language')}
      </p>
      {problem ? <Alert tone="error">{t(problem)}</Alert> : null}
      <Button type="submit" loading={sending}>
        {t('submit')}
      </Button>
      <p className="text-sm text-muted">{t('privacy')}</p>
    </form>
  );
}
